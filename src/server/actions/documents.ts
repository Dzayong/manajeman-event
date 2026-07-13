"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess, canEditDivision } from "@/lib/permissions";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

async function authorizeDivision(divisionId: number) {
  const session = await requireSession();
  const division = await db.division.findUnique({
    where: { id: divisionId },
    select: { id: true, eventId: true },
  });
  if (!division) return { error: "Divisi tidak ditemukan." as const };
  const access = await getEventAccess(session, division.eventId);
  if (!access || !canEditDivision(access, divisionId)) {
    return { error: "Kamu tidak punya akses mengubah divisi ini." as const };
  }
  return { session, division };
}

const linkSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  url: z.string().trim().url("URL tidak valid").max(500),
  category: z.string().trim().max(40).optional(),
});

export async function addLinkDocument(
  divisionId: number,
  input: z.infer<typeof linkSchema>,
): Promise<{ error?: string }> {
  const auth = await authorizeDivision(divisionId);
  if ("error" in auth) return { error: auth.error };
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const doc = await db.document.create({
    data: {
      divisionId,
      title: parsed.data.title,
      type: "LINK",
      url: parsed.data.url,
      category: parsed.data.category || null,
      uploadedById: auth.session.userId,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId,
    action: "document.link",
    targetType: "document",
    targetId: doc.id,
    detail: doc.title,
  });
  revalidatePath(`/divisions/${divisionId}`);
  return {};
}

export async function uploadFileDocument(
  divisionId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const auth = await authorizeDivision(divisionId);
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file terlebih dahulu." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Ukuran file maksimal 10 MB." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", String(divisionId));
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, fileName),
    Buffer.from(await file.arrayBuffer()),
  );

  const category = String(formData.get("category") ?? "").trim();

  const doc = await db.document.create({
    data: {
      divisionId,
      title: file.name,
      type: "FILE",
      url: `/uploads/${divisionId}/${fileName}`,
      category: category || null,
      uploadedById: auth.session.userId,
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId,
    action: "document.upload",
    targetType: "document",
    targetId: doc.id,
    detail: doc.title,
  });
  revalidatePath(`/divisions/${divisionId}`);
  return {};
}

export async function deleteDocument(
  documentId: number,
): Promise<{ error?: string }> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { divisionId: true, title: true },
  });
  if (!doc?.divisionId) return { error: "Dokumen tidak ditemukan." };
  const auth = await authorizeDivision(doc.divisionId);
  if ("error" in auth) return { error: auth.error };

  await db.document.delete({ where: { id: documentId } });

  logActivity({
    userId: auth.session.userId,
    eventId: auth.division.eventId,
    divisionId: doc.divisionId,
    action: "document.delete",
    detail: doc.title,
  });
  revalidatePath(`/divisions/${doc.divisionId}`);
  return {};
}
