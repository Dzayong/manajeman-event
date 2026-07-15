"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { canOperateEvent, getEventAccess } from "@/lib/permissions";

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  body: z.string().trim().min(1, "Isi pengumuman wajib diisi").max(5000),
  deadline: z.string().trim().optional(),
  targetDivisionIds: z.array(z.number().int().positive()).max(100).optional(),
});

async function authorizeOperate(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !canOperateEvent(access)) {
    return {
      error: "Hanya Pengurus, Ketua, Sekretaris, atau Koordinator.",
    } as const;
  }
  return { session };
}

function parseDeadline(value?: string): Date | null | { error: string } {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Tanggal deadline tidak valid." };
  }
  return date;
}

function revalidateAnnouncementViews(
  eventId: number,
  divisionIds: number[],
): void {
  revalidatePath(`/events/${eventId}/workspace`);
  for (const divisionId of divisionIds) {
    revalidatePath(`/divisions/${divisionId}`);
  }
}

export async function createAnnouncement(
  eventId: number,
  input: z.infer<typeof announcementSchema>,
): Promise<{ error?: string }> {
  const auth = await authorizeOperate(eventId);
  if ("error" in auth) return { error: auth.error };

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const deadline = parseDeadline(parsed.data.deadline);
  if (deadline && "error" in deadline) return { error: deadline.error };

  const eventDivisions = await db.division.findMany({
    where: { eventId },
    select: { id: true },
  });
  const eventDivisionIds = new Set(eventDivisions.map((d) => d.id));
  const targetDivisionIds = Array.from(
    new Set(parsed.data.targetDivisionIds ?? []),
  );

  if (targetDivisionIds.some((id) => !eventDivisionIds.has(id))) {
    return { error: "Target divisi tidak valid untuk event ini." };
  }

  const announcement = await db.announcement.create({
    data: {
      eventId,
      title: parsed.data.title,
      body: parsed.data.body,
      deadline: deadline instanceof Date ? deadline : null,
      createdById: auth.session.userId,
      targets:
        targetDivisionIds.length > 0
          ? {
              create: targetDivisionIds.map((divisionId) => ({ divisionId })),
            }
          : undefined,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "announcement.create",
    targetType: "announcement",
    targetId: announcement.id,
    detail: announcement.title,
  });

  revalidateAnnouncementViews(
    eventId,
    targetDivisionIds.length > 0 ? targetDivisionIds : eventDivisions.map((d) => d.id),
  );
  return {};
}

export async function deleteAnnouncement(
  announcementId: number,
): Promise<{ error?: string }> {
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId },
    include: {
      event: { select: { divisions: { select: { id: true } } } },
      targets: { select: { divisionId: true } },
    },
  });
  if (!announcement) return { error: "Pengumuman tidak ditemukan." };

  const auth = await authorizeOperate(announcement.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.announcement.delete({ where: { id: announcementId } });

  logActivity({
    userId: auth.session.userId,
    eventId: announcement.eventId,
    action: "announcement.delete",
    targetType: "announcement",
    targetId: announcement.id,
    detail: announcement.title,
  });

  revalidateAnnouncementViews(
    announcement.eventId,
    announcement.targets.length > 0
      ? announcement.targets.map((target) => target.divisionId)
      : announcement.event.divisions.map((division) => division.id),
  );
  return {};
}
