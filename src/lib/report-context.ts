import { db } from "@/lib/db";
import { POSITION_LABELS } from "@/lib/positions";

/**
 * Compile event data into a plain-text context block for the AI.
 * `includeFinance` also gates the two sections a real LPJ needs but a
 * progress summary doesn't: full committee roster and itemized RAB.
 */
export async function buildEventContext(
  eventId: number,
  options: { includeFinance: boolean },
): Promise<string | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      divisions: {
        include: {
          tasks: {
            select: { title: true, status: true, deadline: true },
          },
          memberships: { select: { id: true } },
        },
      },
      milestones: true,
      attendanceSessions: {
        include: { _count: { select: { attendances: true } } },
      },
      memberships: {
        include: {
          user: { select: { name: true } },
          division: { select: { name: true } },
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
      _count: { select: { memberships: true } },
    },
  });
  if (!event) return null;

  const lines: string[] = [
    `Event: ${event.name}`,
    `Status: ${event.status}. Panitia: ${event._count.memberships} orang.`,
    event.description ? `Deskripsi: ${event.description}` : "",
    "",
    "PROGRESS PER DIVISI:",
  ];

  const now = new Date();
  for (const d of event.divisions) {
    const done = d.tasks.filter((t) => t.status === "DONE").length;
    const overdue = d.tasks.filter(
      (t) => t.status !== "DONE" && t.deadline && t.deadline < now,
    );
    lines.push(
      `- ${d.name} (${d.memberships.length} anggota): ${done}/${d.tasks.length} tugas selesai.` +
        (overdue.length > 0
          ? ` TELAT ${overdue.length}: ${overdue.map((t) => t.title).join(", ")}.`
          : ""),
    );
  }

  if (event.milestones.length > 0) {
    lines.push("", "TIMELINE:");
    for (const m of event.milestones) {
      lines.push(
        `- ${m.title} (${m.dueDate ? m.dueDate.toISOString().slice(0, 10) : "tanpa tanggal"}): ${m.isDone ? "selesai" : "belum"}`,
      );
    }
  }

  if (event.attendanceSessions.length > 0) {
    lines.push("", "PRESENSI:");
    for (const s of event.attendanceSessions) {
      lines.push(
        `- ${s.title}: ${s._count.attendances}/${event._count.memberships} hadir`,
      );
    }
  }

  // Correspondence & other admin paperwork (e.g. Humas' surat-menyurat) is
  // just the existing Documents feature filed under category "Surat" --
  // surfaced here so a report can honestly say how many were recorded,
  // instead of the AI having no way to know and inventing an answer.
  const documents = await db.document.findMany({
    where: { OR: [{ eventId }, { division: { eventId } }] },
    select: {
      title: true,
      category: true,
      createdAt: true,
      division: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const letters = documents.filter((d) => d.category === "Surat");
  if (letters.length > 0) {
    lines.push("", "SURAT-MENYURAT TERCATAT:");
    for (const l of letters) {
      lines.push(
        `- ${l.title} (${l.division?.name ?? "Umum"}, ${l.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`,
      );
    }
  } else {
    lines.push(
      "",
      "SURAT-MENYURAT TERCATAT: belum ada dokumen berkategori \"Surat\" yang diupload divisi mana pun.",
    );
  }

  if (options.includeFinance) {
    // Full roster -- an LPJ needs a "Susunan Kepanitiaan" section with names.
    lines.push("", "SUSUNAN KEPANITIAAN:");
    const core = event.memberships.filter((m) => !m.division);
    for (const m of core) {
      lines.push(`- ${m.user.name}: ${POSITION_LABELS[m.position]}`);
    }
    const byDivision = new Map<string, string[]>();
    for (const m of event.memberships) {
      if (!m.division) continue;
      const list = byDivision.get(m.division.name) ?? [];
      list.push(`${m.user.name} (${POSITION_LABELS[m.position]})`);
      byDivision.set(m.division.name, list);
    }
    for (const [divisionName, members] of byDivision) {
      lines.push(`- Divisi ${divisionName}: ${members.join(", ")}`);
    }

    // Itemized RAB -- an LPJ needs anggaran vs realisasi per pos, not just totals.
    const [rabItems, confirmedRecords] = await Promise.all([
      db.rabItem.findMany({
        where: { eventId },
        include: { division: { select: { name: true } } },
        orderBy: { id: "asc" },
      }),
      db.financeRecord.findMany({
        where: { eventId, status: "CONFIRMED" },
        include: { items: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const recordsByRab = new Map<number | null, typeof confirmedRecords>();
    for (const rec of confirmedRecords) {
      const key = rec.rabItemId;
      const list = recordsByRab.get(key) ?? [];
      list.push(rec);
      recordsByRab.set(key, list);
    }

    function pushRecordItems(records: typeof confirmedRecords) {
      for (const rec of records) {
        if (rec.items.length === 0) {
          if (rec.note) lines.push(`    - ${rec.note}: Rp${Number(rec.totalAmount).toLocaleString("id-ID")}`);
          continue;
        }
        for (const item of rec.items) {
          lines.push(
            `    - ${item.itemName}: ${item.quantity} x Rp${Number(item.unitPrice).toLocaleString("id-ID")} = Rp${Number(item.subtotal).toLocaleString("id-ID")}`,
          );
        }
      }
    }

    lines.push("", "REALISASI ANGGARAN (per pos, HANYA struk yang sudah dikonfirmasi):");
    if (rabItems.length === 0) {
      lines.push("- Belum ada pos RAB yang diinput.");
    }
    let totalBudget = 0;
    let totalRealized = 0;
    for (const item of rabItems) {
      const subtotal = Number(item.subtotal);
      const records = recordsByRab.get(item.id) ?? [];
      const realized = records.reduce((s, r) => s + Number(r.totalAmount), 0);
      totalBudget += subtotal;
      totalRealized += realized;
      lines.push(
        `- ${item.itemName} (${item.division?.name ?? "Umum"}): anggaran Rp${subtotal.toLocaleString("id-ID")}, realisasi Rp${realized.toLocaleString("id-ID")}, selisih Rp${(subtotal - realized).toLocaleString("id-ID")}`,
      );
      pushRecordItems(records);
      recordsByRab.delete(item.id);
    }

    // Confirmed spending not linked to any RAB pos -- still real money spent,
    // must not be silently dropped from the total (was a real undercount bug).
    const unlinkedRecords = recordsByRab.get(null) ?? [];
    if (unlinkedRecords.length > 0) {
      const unlinkedTotal = unlinkedRecords.reduce((s, r) => s + Number(r.totalAmount), 0);
      totalRealized += unlinkedTotal;
      lines.push(
        `- Pengeluaran tanpa pos RAB: realisasi Rp${unlinkedTotal.toLocaleString("id-ID")}`,
      );
      pushRecordItems(unlinkedRecords);
    }

    lines.push(
      `- TOTAL: anggaran Rp${totalBudget.toLocaleString("id-ID")}, realisasi Rp${totalRealized.toLocaleString("id-ID")}, selisih Rp${(totalBudget - totalRealized).toLocaleString("id-ID")}`,
    );

    const draftCount = await db.financeRecord.count({
      where: { eventId, status: "DRAFT" },
    });
    if (draftCount > 0) {
      lines.push(
        `- Catatan: ada ${draftCount} struk berstatus draft (belum dikonfirmasi) yang TIDAK dihitung di atas.`,
      );
    }
  }

  return lines.filter((l) => l !== undefined).join("\n");
}
