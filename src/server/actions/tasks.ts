"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess, canEditDivision } from "@/lib/permissions";

const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Judul tugas wajib diisi").max(200),
  description: z.string().trim().max(2000).optional(),
  picUserId: z.number().int().nullable(),
  deadline: z.string().optional(),
  checklist: z.array(z.string().trim().min(1).max(200)).max(30),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

async function authorizeDivision(divisionId: number) {
  const session = await requireSession();
  const division = await db.division.findUnique({
    where: { id: divisionId },
    select: { id: true, eventId: true, name: true },
  });
  if (!division) return { error: "Divisi tidak ditemukan." as const };
  const access = await getEventAccess(session, division.eventId);
  if (!access || !canEditDivision(access, divisionId)) {
    return { error: "Kamu tidak punya akses mengubah divisi ini." as const };
  }
  return { session, division };
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createTask(
  divisionId: number,
  input: TaskInput,
): Promise<{ error?: string }> {
  const auth = await authorizeDivision(divisionId);
  if ("error" in auth) return { error: auth.error };
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const task = await db.task.create({
    data: {
      divisionId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      picUserId: parsed.data.picUserId,
      deadline: toDate(parsed.data.deadline),
      createdById: auth.session.userId,
      checklistItems: {
        create: parsed.data.checklist.map((label, i) => ({
          label,
          sortOrder: i,
        })),
      },
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId,
    action: "task.create",
    targetType: "task",
    targetId: task.id,
    detail: task.title,
  });
  revalidatePath(`/divisions/${divisionId}`);
  return {};
}

export async function updateTask(
  taskId: number,
  input: TaskInput,
): Promise<{ error?: string }> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { divisionId: true },
  });
  if (!task) return { error: "Tugas tidak ditemukan." };
  const auth = await authorizeDivision(task.divisionId);
  if ("error" in auth) return { error: auth.error };
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      picUserId: parsed.data.picUserId,
      deadline: toDate(parsed.data.deadline),
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId: task.divisionId,
    action: "task.update",
    targetType: "task",
    targetId: taskId,
  });
  revalidatePath(`/divisions/${task.divisionId}`);
  return {};
}

export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus,
): Promise<{ error?: string }> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { divisionId: true, title: true },
  });
  if (!task) return { error: "Tugas tidak ditemukan." };
  const auth = await authorizeDivision(task.divisionId);
  if ("error" in auth) return { error: auth.error };

  await db.task.update({ where: { id: taskId }, data: { status } });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId: task.divisionId,
    action: "task.status",
    targetType: "task",
    targetId: taskId,
    detail: `${task.title} → ${status}`,
  });
  revalidatePath(`/divisions/${task.divisionId}`);
  return {};
}

export async function deleteTask(taskId: number): Promise<{ error?: string }> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { divisionId: true, title: true },
  });
  if (!task) return { error: "Tugas tidak ditemukan." };
  const auth = await authorizeDivision(task.divisionId);
  if ("error" in auth) return { error: auth.error };

  await db.task.delete({ where: { id: taskId } });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId: task.divisionId,
    action: "task.delete",
    detail: task.title,
  });
  revalidatePath(`/divisions/${task.divisionId}`);
  return {};
}

export async function toggleChecklistItem(
  itemId: number,
  isDone: boolean,
): Promise<{ error?: string }> {
  const item = await db.taskChecklistItem.findUnique({
    where: { id: itemId },
    include: { task: { select: { divisionId: true } } },
  });
  if (!item) return { error: "Item tidak ditemukan." };
  const auth = await authorizeDivision(item.task.divisionId);
  if ("error" in auth) return { error: auth.error };

  await db.taskChecklistItem.update({
    where: { id: itemId },
    data: { isDone },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId: item.task.divisionId,
    action: "task.checklist",
    targetType: "task",
    targetId: item.taskId,
    detail: `${item.label}: ${isDone ? "selesai" : "dibuka lagi"}`,
  });
  revalidatePath(`/divisions/${item.task.divisionId}`);
  return {};
}
