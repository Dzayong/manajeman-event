"use server";

import { requirePengurus } from "@/lib/authz";
import { extractRoster } from "@/lib/ai";

export type RosterRow = {
  name: string;
  email: string;
  division: string;
  position: string;
};

/** Read a committee roster photo/screenshot into editable rows (AI vision). */
export async function parseRosterPhoto(
  formData: FormData,
): Promise<{ rows?: RosterRow[]; error?: string }> {
  await requirePengurus();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih foto terlebih dahulu." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "File harus berupa gambar." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Ukuran foto maksimal 8 MB." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractRoster(buffer.toString("base64"), file.type);
    return { rows: result.members.filter((m) => m.name.trim()) };
  } catch (e) {
    console.error("roster OCR failed:", e);
    return { error: "AI gagal membaca foto — coba gambar yang lebih jelas." };
  }
}
