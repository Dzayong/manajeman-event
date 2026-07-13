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
    const [rabItems, realizedByRab] = await Promise.all([
      db.rabItem.findMany({
        where: { eventId },
        include: { division: { select: { name: true } } },
        orderBy: { id: "asc" },
      }),
      db.financeRecord.groupBy({
        by: ["rabItemId"],
        where: { eventId, status: "CONFIRMED" },
        _sum: { totalAmount: true },
      }),
    ]);
    const realizedMap = new Map(
      realizedByRab.map((r) => [r.rabItemId, Number(r._sum.totalAmount ?? 0)]),
    );

    lines.push("", "REALISASI ANGGARAN (per pos):");
    if (rabItems.length === 0) {
      lines.push("- Belum ada pos RAB yang diinput.");
    }
    let totalBudget = 0;
    let totalRealized = 0;
    for (const item of rabItems) {
      const subtotal = Number(item.subtotal);
      const realized = realizedMap.get(item.id) ?? 0;
      totalBudget += subtotal;
      totalRealized += realized;
      lines.push(
        `- ${item.itemName} (${item.division?.name ?? "Umum"}): anggaran Rp${subtotal.toLocaleString("id-ID")}, realisasi Rp${realized.toLocaleString("id-ID")}, selisih Rp${(subtotal - realized).toLocaleString("id-ID")}`,
      );
    }
    lines.push(
      `- TOTAL: anggaran Rp${totalBudget.toLocaleString("id-ID")}, realisasi Rp${totalRealized.toLocaleString("id-ID")}, selisih Rp${(totalBudget - totalRealized).toLocaleString("id-ID")}`,
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}
