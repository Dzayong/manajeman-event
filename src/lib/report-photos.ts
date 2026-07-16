import { db } from "@/lib/db";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export type ReportPhoto = {
  id: string;
  url: string;
  caption: string;
  subCaption: string;
};

export type ReportPhotos = {
  receipts: ReportPhoto[];
  documentation: ReportPhoto[];
};

/** Real photo evidence for an LPJ appendix: confirmed receipt scans (the
 * actual money spent) plus any "Dokumentasi" document uploads across the
 * event's divisions. Only CONFIRMED receipts count -- same rule used for
 * the realized-budget totals, so the appendix never shows spending that
 * was never signed off. */
export async function getReportPhotos(eventId: number): Promise<ReportPhotos> {
  const [confirmedRecords, docs] = await Promise.all([
    db.financeRecord.findMany({
      where: { eventId, status: "CONFIRMED", receiptUrl: { not: null } },
      include: { rabItem: { select: { itemName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.document.findMany({
      where: {
        type: "FILE",
        category: "Dokumentasi",
        OR: [{ eventId }, { division: { eventId } }],
      },
      include: { division: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const receipts: ReportPhoto[] = confirmedRecords
    .filter((r) => r.receiptUrl)
    .map((r) => ({
      id: `receipt-${r.id}`,
      url: r.receiptUrl!,
      caption: r.rabItem?.itemName ?? "Pengeluaran umum",
      subCaption: `Rp${Number(r.totalAmount).toLocaleString("id-ID")} · ${r.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`,
    }));

  const documentation: ReportPhoto[] = docs
    .filter((d) => isImageUrl(d.url))
    .map((d) => ({
      id: `doc-${d.id}`,
      url: d.url,
      caption: d.title,
      subCaption: `${d.division?.name ?? "Umum"} · ${d.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`,
    }));

  return { receipts, documentation };
}
