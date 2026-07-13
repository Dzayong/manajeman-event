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

const SUMMARY_MOCK = `Ringkasan progress (contoh mode mock):

Secara keseluruhan persiapan berjalan baik dengan progress 45%. Divisi Logistik dan Konsumsi on-track — booking ruangan selesai dan vendor katering sudah deal. Divisi Acara perlu perhatian: rundown belum final dan brief MC belum dimulai, padahal gladi bersih tinggal seminggu.

Risiko utama: (1) rundown yang terlambat menghambat brief MC dan gladi; (2) dua tugas Humas melewati deadline tanpa update. Disarankan koordinator Acara memecah tugas rundown dan menetapkan PIC hari ini.`;

export async function summarizeProgress(context: string): Promise<string> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 1500));
    return SUMMARY_MOCK;
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

const LPJ_MOCK = `LAPORAN PERTANGGUNGJAWABAN (draft mode mock)

A. PENDAHULUAN
Kegiatan telah dilaksanakan sesuai rencana dengan melibatkan seluruh divisi kepanitiaan.

B. PELAKSANAAN KEGIATAN
Seluruh divisi menjalankan tugasnya: Acara menyusun rundown dan memandu jalannya kegiatan, Logistik menyiapkan tempat dan peralatan, Konsumsi menyediakan konsumsi peserta dan panitia, Humas menangani publikasi dan undangan, serta Korlap mengatur alur peserta.

C. REALISASI ANGGARAN
Realisasi pengeluaran tercatat melalui sistem dengan bukti struk terlampir. Rincian per pos anggaran tersedia pada lampiran keuangan.

D. EVALUASI
Kehadiran panitia pada rapat dan hari-H tercatat baik. Beberapa tugas melewati tenggat dan menjadi catatan perbaikan untuk kegiatan berikutnya.

E. PENUTUP
Demikian laporan ini disusun sebagai bentuk pertanggungjawaban panitia.`;

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
    return LPJ_MOCK;
  }

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Kamu asisten sekretaris himpunan mahasiswa. Susun DRAFT Laporan Pertanggungjawaban (LPJ) kegiatan dari data berikut, dengan struktur: Pendahuluan, Pelaksanaan Kegiatan (per divisi), Realisasi Anggaran (ringkas, sebut total anggaran vs realisasi), Evaluasi (kehadiran & kendala), Penutup. Bahasa Indonesia formal. Maksimal 500 kata. Jangan mengarang angka yang tidak ada di data.",
      },
      { role: "user", content: context },
    ],
    max_tokens: 1200,
  });
  return response.choices[0]?.message?.content ?? "";
}
