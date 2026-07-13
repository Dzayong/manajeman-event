"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { getEventAccess, canManageFinance } from "@/lib/permissions";
import { extractReceipt } from "@/lib/ai";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function authorizeFinance(eventId: number) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access || !canManageFinance(access)) {
    return {
      error: "Hanya Bendahara, Ketua, Sekretaris, atau Pengurus." as const,
    };
  }
  return { session };
}

// ---------- RAB (budget plan) ----------

const rabSchema = z.object({
  divisionId: z.number().int().nullable(),
  itemName: z.string().trim().min(1, "Nama pos wajib diisi").max(200),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  note: z.string().trim().max(255).optional(),
});

export async function addRabItem(
  eventId: number,
  input: z.infer<typeof rabSchema>,
): Promise<{ error?: string }> {
  const auth = await authorizeFinance(eventId);
  if ("error" in auth) return { error: auth.error };
  const parsed = rabSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const subtotal = parsed.data.quantity * parsed.data.unitPrice;
  const item = await db.rabItem.create({
    data: { eventId, ...parsed.data, note: parsed.data.note || null, subtotal },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "rab.create",
    detail: item.itemName,
  });
  revalidatePath(`/events/${eventId}/finance`);
  return {};
}

export async function deleteRabItem(
  rabItemId: number,
): Promise<{ error?: string }> {
  const item = await db.rabItem.findUnique({ where: { id: rabItemId } });
  if (!item) return { error: "Pos RAB tidak ditemukan." };
  const auth = await authorizeFinance(item.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.rabItem.delete({ where: { id: rabItemId } });
  logActivity({
    userId: auth.session.userId,
    eventId: item.eventId,
    action: "rab.delete",
    detail: item.itemName,
  });
  revalidatePath(`/events/${item.eventId}/finance`);
  return {};
}

// ---------- Receipts (realization) ----------

export async function uploadReceipt(
  eventId: number,
  formData: FormData,
): Promise<{ recordId?: number; error?: string }> {
  const auth = await authorizeFinance(eventId);
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih foto struk terlebih dahulu." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Ukuran foto maksimal 8 MB." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "File harus berupa gambar (foto struk)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), "public", "uploads", "receipts", String(eventId));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);

  let extraction;
  try {
    extraction = await extractReceipt(buffer.toString("base64"), file.type);
  } catch (e) {
    console.error("receipt OCR failed:", e);
    return {
      error: "AI gagal membaca struk — coba foto yang lebih jelas.",
    };
  }

  const record = await db.financeRecord.create({
    data: {
      eventId,
      uploadedById: auth.session.userId,
      receiptUrl: `/uploads/receipts/${eventId}/${safeName}`,
      totalAmount: extraction.total_amount,
      status: "DRAFT",
      items: {
        create: extraction.items.map((i) => ({
          itemName: i.item_name.slice(0, 200),
          quantity: Math.max(1, Math.round(i.quantity)),
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
      },
    },
  });

  logActivity({
    userId: auth.session.userId,
    eventId,
    action: "finance.scan_receipt",
    targetType: "finance_record",
    targetId: record.id,
  });
  revalidatePath(`/events/${eventId}/finance`);
  return { recordId: record.id };
}

const recordUpdateSchema = z.object({
  divisionId: z.number().int().nullable(),
  rabItemId: z.number().int().nullable(),
  note: z.string().trim().max(255).optional(),
  items: z
    .array(
      z.object({
        itemName: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1, "Minimal satu item"),
});

export async function updateFinanceRecord(
  recordId: number,
  input: z.infer<typeof recordUpdateSchema>,
): Promise<{ error?: string }> {
  const record = await db.financeRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Catatan tidak ditemukan." };
  const auth = await authorizeFinance(record.eventId);
  if ("error" in auth) return { error: auth.error };
  const parsed = recordUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const items = parsed.data.items.map((i) => ({
    itemName: i.itemName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.quantity * i.unitPrice,
  }));
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

  await db.$transaction([
    db.financeItem.deleteMany({ where: { financeRecordId: recordId } }),
    db.financeRecord.update({
      where: { id: recordId },
      data: {
        divisionId: parsed.data.divisionId,
        rabItemId: parsed.data.rabItemId,
        note: parsed.data.note || null,
        totalAmount,
        items: { create: items },
      },
    }),
  ]);

  logActivity({
    userId: auth.session.userId,
    eventId: record.eventId,
    action: "finance.update_record",
    targetType: "finance_record",
    targetId: recordId,
  });
  revalidatePath(`/events/${record.eventId}/finance`);
  revalidatePath(`/events/${record.eventId}/finance/${recordId}`);
  return {};
}

export async function confirmFinanceRecord(
  recordId: number,
): Promise<{ error?: string }> {
  const record = await db.financeRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Catatan tidak ditemukan." };
  const auth = await authorizeFinance(record.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.financeRecord.update({
    where: { id: recordId },
    data: { status: "CONFIRMED" },
  });
  logActivity({
    userId: auth.session.userId,
    eventId: record.eventId,
    action: "finance.confirm_record",
    targetType: "finance_record",
    targetId: recordId,
  });
  revalidatePath(`/events/${record.eventId}/finance`);
  revalidatePath(`/events/${record.eventId}/finance/${recordId}`);
  return {};
}

export async function deleteFinanceRecord(
  recordId: number,
): Promise<{ error?: string }> {
  const record = await db.financeRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Catatan tidak ditemukan." };
  const auth = await authorizeFinance(record.eventId);
  if ("error" in auth) return { error: auth.error };

  await db.financeRecord.delete({ where: { id: recordId } });
  logActivity({
    userId: auth.session.userId,
    eventId: record.eventId,
    action: "finance.delete_record",
    targetType: "finance_record",
    targetId: recordId,
  });
  revalidatePath(`/events/${record.eventId}/finance`);
  return {};
}
