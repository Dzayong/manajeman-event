"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess } from "@/lib/permissions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function authorizeEvent(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !access.canManageEvent) {
    return {
      error: "Hanya Pengurus, Ketua, atau Sekretaris." as const,
    };
  }
  return { session };
}

const linkSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  url: z.string().trim().url("URL tidak valid").max(500),
});

export async function addEventLinkDocument(
  eventId: number,
  input: z.infer<typeof linkSchema>,
): Promise<{ error?: string }> {
  const auth = await authorizeEvent(eventId);
  if ("error" in auth) return { error: auth.error };
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const doc = await db.document.create({
    data: {
      eventId,
      title: parsed.data.title,
      type: "LINK",
      url: parsed.data.url,
      uploadedById: auth.session.userId,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "event_document.link",
    targetType: "document",
    targetId: doc.id,
    detail: doc.title,
  });
  revalidatePath(`/events/${eventId}/workspace`);
  return {};
}

export async function uploadEventFileDocument(
  eventId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const auth = await authorizeEvent(eventId);
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file terlebih dahulu." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Ukuran file maksimal 10 MB." };
  }

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "event-docs",
    String(eventId),
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, safeName),
    Buffer.from(await file.arrayBuffer()),
  );

  const doc = await db.document.create({
    data: {
      eventId,
      title: file.name,
      type: "FILE",
      url: `/uploads/event-docs/${eventId}/${safeName}`,
      uploadedById: auth.session.userId,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "event_document.upload",
    targetType: "document",
    targetId: doc.id,
    detail: doc.title,
  });
  revalidatePath(`/events/${eventId}/workspace`);
  return {};
}

export async function deleteEventDocument(
  documentId: number,
): Promise<{ error?: string }> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { eventId: true, title: true },
  });
  if (!doc?.eventId) return { error: "Dokumen tidak ditemukan." };
  const auth = await authorizeEvent(doc.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.document.delete({ where: { id: documentId } });

  logActivity({
    userId: auth.session.userId,
    eventId: doc.eventId,
    action: "event_document.delete",
    detail: doc.title,
  });
  revalidatePath(`/events/${doc.eventId}/workspace`);
  return {};
}
