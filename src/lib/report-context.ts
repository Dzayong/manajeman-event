import { db } from "@/lib/db";

/** Compile event data into a plain-text context block for the AI. */
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
    const [rabSum, realizedSum] = await Promise.all([
      db.rabItem.aggregate({ where: { eventId }, _sum: { subtotal: true } }),
      db.financeRecord.aggregate({
        where: { eventId, status: "CONFIRMED" },
        _sum: { totalAmount: true },
      }),
    ]);
    lines.push(
      "",
      "KEUANGAN:",
      `- Total anggaran (RAB): Rp${Number(rabSum._sum.subtotal ?? 0).toLocaleString("id-ID")}`,
      `- Total realisasi terkonfirmasi: Rp${Number(realizedSum._sum.totalAmount ?? 0).toLocaleString("id-ID")}`,
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}
