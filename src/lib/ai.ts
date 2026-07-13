import OpenAI from "openai";

/**
 * All OpenAI calls live here and run server-side only.
 * AI_MOCK=true returns realistic sample data without spending quota —
 * flip to false only for final testing and the live demo.
 */

const MODEL = "gpt-4o-mini";

function isMock(): boolean {
  return process.env.AI_MOCK === "true" || !process.env.OPENAI_API_KEY;
}

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function parseJsonBlock<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ---------- Receipt OCR ----------

export type ReceiptExtraction = {
  items: { item_name: string; quantity: number; unit_price: number; subtotal: number }[];
  total_amount: number;
  currency: string;
};

const RECEIPT_MOCK: ReceiptExtraction = {
  items: [
    { item_name: "Nasi box ayam", quantity: 50, unit_price: 15000, subtotal: 750000 },
    { item_name: "Air mineral dus", quantity: 5, unit_price: 28000, subtotal: 140000 },
    { item_name: "Snack ringan", quantity: 40, unit_price: 5000, subtotal: 200000 },
  ],
  total_amount: 1090000,
  currency: "IDR",
};

export async function extractReceipt(
  imageBase64: string,
  mimeType: string,
): Promise<ReceiptExtraction> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 1200));
    return RECEIPT_MOCK;
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          'Kamu asisten pembukuan. Dari gambar struk belanja ini, ekstrak setiap item beserta kuantitas dan harga satuan. Balas HANYA JSON valid: {"items":[{"item_name":"...","quantity":1,"unit_price":0,"subtotal":0}],"total_amount":0,"currency":"IDR"}. Jika angka tak terbaca isi 0. Jangan mengarang item.',
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 1500,
  });

  return parseJsonBlock<ReceiptExtraction>(
    response.choices[0]?.message?.content ?? "{}",
  );
}

// ---------- Committee roster photo ----------

export type RosterExtraction = {
  members: { name: string; email: string; division: string; position: string }[];
};

const ROSTER_MOCK: RosterExtraction = {
  members: [
    { name: "Andi Pratama", email: "", division: "Acara", position: "Koordinator" },
    { name: "Budi Santoso", email: "", division: "Acara", position: "Staff" },
    { name: "Citra Lestari", email: "", division: "Humas", position: "Staff" },
  ],
};

export async function extractRoster(
  imageBase64: string,
  mimeType: string,
): Promise<RosterExtraction> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 1200));
    return ROSTER_MOCK;
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          'Dari foto/screenshot daftar panitia ini, ekstrak nama anggota beserta email, divisi, dan posisi bila tertulis. Balas HANYA JSON valid: {"members":[{"name":"...","email":"","division":"","position":""}]}. Kosongkan field yang tidak terbaca. Jangan mengarang nama.',
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  return parseJsonBlock<RosterExtraction>(
    response.choices[0]?.message?.content ?? "{}",
  );
}

// ---------- Progress summary & LPJ draft ----------

/**
 * Mock mode used to return canned boilerplate unrelated to the actual
 * event — meaning testing "Rangkum Progress" always showed the same
 * fictional paragraph no matter what data existed. That made it
 * impossible to sanity-check the feature without spending real API
 * quota. Instead, mock now echoes the REAL context that would be sent
 * to the AI, so you can verify your data flows through correctly before
 * switching AI_MOCK off.
 */
function mockSummary(context: string): string {
  return `RINGKASAN PROGRESS — MODE MOCK

Ini BUKAN narasi AI — ini data mentah yang akan dikirim ke AI asli. Nyalakan
AI_MOCK=false + isi OPENAI_API_KEY untuk melihat AI menulis ini jadi
paragraf naratif (divisi on-track, tertinggal, dan risiko utama).

${context}`;
}

export async function summarizeProgress(context: string): Promise<string> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 1500));
    return mockSummary(context);
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Kamu asisten sekretaris himpunan. Dari data progress divisi berikut, buat ringkasan status acara yang rapi & profesional: sebutkan divisi yang on-track, yang tertinggal, dan risiko utama. Bahasa Indonesia formal, maksimal 200 kata.",
      },
      { role: "user", content: context },
    ],
    max_tokens: 600,
  });
  return response.choices[0]?.message?.content ?? "";
}

function mockLpj(context: string): string {
  return `DRAFT LPJ — MODE MOCK

Ini BUKAN narasi AI — ini data mentah (termasuk susunan kepanitiaan dan
realisasi anggaran per pos) yang akan dikirim ke AI asli. Nyalakan
AI_MOCK=false + isi OPENAI_API_KEY untuk melihat AI menyusun ini jadi LPJ
resmi: Pendahuluan, Nama & Tema Kegiatan, Waktu & Tempat, Susunan
Kepanitiaan, Pelaksanaan per Divisi, Realisasi Anggaran (tabel), Evaluasi,
Penutup.

${context}`;
}

// ---------- Chat-based report revision ----------

export type ReviseResult = { reply: string; revisedContent: string };

export async function reviseReport(params: {
  type: "PROGRESS_SUMMARY" | "LPJ_DRAFT";
  currentContent: string;
  instruction: string;
}): Promise<ReviseResult> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 900));
    return {
      reply: `(Mode mock) Sudah kutandai revisi sesuai instruksi. Di mode AI asli, isi dokumen akan benar-benar diubah mengikuti permintaanmu.`,
      revisedContent: `${params.currentContent}\n\n[Revisi mock] ${params.instruction}`,
    };
  }

  const label =
    params.type === "LPJ_DRAFT" ? "draft LPJ" : "ringkasan progress";

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Kamu asisten sekretaris himpunan yang membantu merevisi ${label} lewat percakapan. Balas HANYA JSON valid: {"reply":"...","revised_content":"..."}. "reply" adalah balasan singkat (maksimal 2 kalimat) menjelaskan apa yang kamu ubah, bahasa Indonesia. "revised_content" adalah versi LENGKAP dokumen setelah revisi (bukan hanya bagian yang berubah), bahasa Indonesia formal. Jangan mengarang data yang tidak ada di dokumen asli.`,
      },
      {
        role: "user",
        content: `DOKUMEN SAAT INI:\n${params.currentContent}\n\nINSTRUKSI REVISI:\n${params.instruction}`,
      },
    ],
    max_tokens: 1500,
  });

  const parsed = parseJsonBlock<{ reply: string; revised_content: string }>(
    response.choices[0]?.message?.content ?? "{}",
  );
  return { reply: parsed.reply, revisedContent: parsed.revised_content };
}

export async function draftLpj(context: string): Promise<string> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 1800));
    return mockLpj(context);
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Kamu asisten sekretaris himpunan mahasiswa. Susun DRAFT Laporan Pertanggungjawaban (LPJ) resmi dari data berikut, mengikuti struktur baku LPJ kampus: I. Pendahuluan (latar belakang & tujuan singkat), II. Nama dan Tema Kegiatan, III. Waktu dan Tempat Pelaksanaan, IV. Susunan Kepanitiaan (tulis SEMUA nama sesuai data, dikelompokkan per divisi), V. Gambaran Pelaksanaan per Divisi, VI. Realisasi Anggaran (buat tabel markdown: Pos | Anggaran | Realisasi | Selisih, lalu baris Total), VII. Evaluasi dan Kendala, VIII. Penutup. Gunakan HANYA nama, angka, dan data yang benar-benar ada di bawah — jangan mengarang siapa pun atau angka apa pun yang tidak tercantum. Bahasa Indonesia formal. Maksimal 700 kata.",
      },
      { role: "user", content: context },
    ],
    max_tokens: 1800,
  });
  return response.choices[0]?.message?.content ?? "";
}
