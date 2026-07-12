"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EventStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePengurus } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { findTemplate } from "@/lib/division-templates";

const divisionInputSchema = z.object({
  name: z.string().trim().min(1, "Nama divisi wajib diisi").max(120),
  description: z.string().trim().max(500).optional(),
  useStarterTasks: z.boolean(),
});

const eventInputSchema = z.object({
  name: z.string().trim().min(1, "Nama event wajib diisi").max(160),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(160).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  divisions: z.array(divisionInputSchema).min(1, "Minimal satu divisi"),
});

export type EventInput = z.infer<typeof eventInputSchema>;

function toDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createEvent(
  input: EventInput,
): Promise<{ id?: number; error?: string }> {
  const session = await requirePengurus();
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { divisions, ...fields } = parsed.data;

  const event = await db.event.create({
    data: {
      name: fields.name,
      description: fields.description || null,
      location: fields.location || null,
      startDate: toDate(fields.startDate),
      endDate: toDate(fields.endDate),
      createdById: session.userId,
      divisions: {
        create: divisions.map((d) => ({
          name: d.name,
          description:
            d.description || findTemplate(d.name)?.description || null,
        })),
      },
    },
    include: { divisions: true },
  });

  const starterTasks = event.divisions.flatMap((division) => {
    const wanted = divisions.find(
      (d) => d.name.toLowerCase() === division.name.toLowerCase(),
    );
    if (!wanted?.useStarterTasks) return [];
    const template = findTemplate(division.name);
    if (!template) return [];
    return template.starterTasks.map((title) => ({
      divisionId: division.id,
      title,
      createdById: session.userId,
    }));
  });
  if (starterTasks.length > 0) {
    await db.task.createMany({ data: starterTasks });
  }

  logActivity({
    userId: session.userId,
    eventId: event.id,
    action: "event.create",
    detail: event.name,
  });
  revalidatePath("/dashboard");
  return { id: event.id };
}

const eventUpdateSchema = eventInputSchema.omit({ divisions: true });

export async function updateEvent(
  eventId: number,
  input: z.infer<typeof eventUpdateSchema>,
): Promise<{ error?: string }> {
  const session = await requirePengurus();
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.event.update({
    where: { id: eventId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      startDate: toDate(parsed.data.startDate),
      endDate: toDate(parsed.data.endDate),
    },
  });

  logActivity({ userId: session.userId, eventId, action: "event.update" });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function updateEventStatus(
  eventId: number,
  status: EventStatus,
): Promise<void> {
  const session = await requirePengurus();
  await db.event.update({ where: { id: eventId }, data: { status } });
  logActivity({
    userId: session.userId,
    eventId,
    action: "event.status",
    detail: status,
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

export async function deleteEvent(eventId: number): Promise<void> {
  const session = await requirePengurus();
  const event = await db.event.delete({ where: { id: eventId } });
  logActivity({
    userId: session.userId,
    action: "event.delete",
    detail: event.name,
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function addDivision(
  eventId: number,
  input: z.infer<typeof divisionInputSchema>,
): Promise<{ error?: string }> {
  const session = await requirePengurus();
  const parsed = divisionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const division = await db.division.create({
    data: {
      eventId,
      name: parsed.data.name,
      description:
        parsed.data.description ||
        findTemplate(parsed.data.name)?.description ||
        null,
    },
  });

  if (parsed.data.useStarterTasks) {
    const template = findTemplate(parsed.data.name);
    if (template) {
      await db.task.createMany({
        data: template.starterTasks.map((title) => ({
          divisionId: division.id,
          title,
          createdById: session.userId,
        })),
      });
    }
  }

  logActivity({
    userId: session.userId,
    eventId,
    divisionId: division.id,
    action: "division.create",
    detail: division.name,
  });
  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function deleteDivision(divisionId: number): Promise<void> {
  const session = await requirePengurus();
  const division = await db.division.delete({ where: { id: divisionId } });
  logActivity({
    userId: session.userId,
    eventId: division.eventId,
    action: "division.delete",
    detail: division.name,
  });
  revalidatePath(`/events/${division.eventId}`);
}

export async function updateRules(
  eventId: number,
  content: string,
): Promise<{ error?: string }> {
  const session = await requirePengurus();
  const trimmed = content.trim();
  if (trimmed.length === 0) return { error: "Isi aturan tidak boleh kosong." };

  await db.event.update({
    where: { id: eventId },
    data: { rulesContent: trimmed, rulesVersion: { increment: 1 } },
  });

  logActivity({ userId: session.userId, eventId, action: "rules.update" });
  revalidatePath(`/events/${eventId}`);
  return {};
}
