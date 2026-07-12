"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess } from "@/lib/permissions";

async function authorizeManage(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !access.canManageEvent) {
    return { error: "Hanya Pengurus, Ketua, atau Sekretaris." as const };
  }
  return { session };
}

const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  dueDate: z.string().optional(),
});

export async function addMilestone(
  eventId: number,
  input: z.infer<typeof milestoneSchema>,
): Promise<{ error?: string }> {
  const auth = await authorizeManage(eventId);
  if ("error" in auth) return { error: auth.error };
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const milestone = await db.milestone.create({
    data: {
      eventId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "milestone.create",
    detail: milestone.title,
  });
  revalidatePath(`/events/${eventId}/workspace`);
  return {};
}

export async function toggleMilestone(
  milestoneId: number,
  isDone: boolean,
): Promise<{ error?: string }> {
  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
  });
  if (!milestone) return { error: "Milestone tidak ditemukan." };
  const auth = await authorizeManage(milestone.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.milestone.update({ where: { id: milestoneId }, data: { isDone } });

  logActivity({
    userId: auth.session.userId,
    eventId: milestone.eventId,
    action: "milestone.toggle",
    detail: `${milestone.title}: ${isDone ? "selesai" : "dibuka lagi"}`,
  });
  revalidatePath(`/events/${milestone.eventId}/workspace`);
  return {};
}

export async function deleteMilestone(
  milestoneId: number,
): Promise<{ error?: string }> {
  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
  });
  if (!milestone) return { error: "Milestone tidak ditemukan." };
  const auth = await authorizeManage(milestone.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.milestone.delete({ where: { id: milestoneId } });

  logActivity({
    userId: auth.session.userId,
    eventId: milestone.eventId,
    action: "milestone.delete",
    detail: milestone.title,
  });
  revalidatePath(`/events/${milestone.eventId}/workspace`);
  return {};
}
