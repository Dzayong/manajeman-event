import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { buildEventContext } from "@/lib/report-context";

/** Email PICs whose tasks are due tomorrow and not done. Returns count sent. */
export async function sendDeadlineReminders(): Promise<number> {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const tasks = await db.task.findMany({
    where: {
      status: { not: "DONE" },
      deadline: { gte: start, lt: end },
      pic: { email: { not: null } },
    },
    include: {
      pic: { select: { name: true, email: true } },
      division: {
        select: { name: true, event: { select: { name: true } } },
      },
    },
  });

  let sent = 0;
  for (const task of tasks) {
    if (!task.pic?.email) continue;
    const status = await sendMail({
      to: task.pic.email,
      subject: `Reminder: "${task.title}" tenggat besok — ${task.division.event.name}`,
      html: `<p>Halo ${task.pic.name},</p>
        <p>Tugasmu <strong>${task.title}</strong> (Divisi ${task.division.name},
        event ${task.division.event.name}) jatuh tempo <strong>besok</strong>
        dan statusnya belum selesai.</p>
        <p>Update progresnya di ${process.env.APP_URL ?? ""}/dashboard</p>
        <p>— Sistem Kepanitiaan HMIF</p>`,
    });
    if (status === "sent" || status === "mocked") sent++;
  }
  return sent;
}

/** Email each ongoing event's Ketua Pelaksana a progress recap. */
export async function sendWeeklyRecaps(): Promise<number> {
  const events = await db.event.findMany({
    where: { status: "ONGOING" },
    include: {
      memberships: {
        where: { position: "KETUA_PANITIA" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  let sent = 0;
  for (const event of events) {
    const context = await buildEventContext(event.id, {
      includeFinance: true,
    });
    if (!context) continue;
    for (const m of event.memberships) {
      if (!m.user.email) continue;
      const status = await sendMail({
        to: m.user.email,
        subject: `Rekap mingguan ${event.name} — Sistem Kepanitiaan HMIF`,
        html: `<p>Halo ${m.user.name},</p>
          <p>Berikut rekap kondisi kepanitiaan minggu ini:</p>
          <pre style="background:#f4f4f5;padding:12px;border-radius:8px;white-space:pre-wrap;font-family:inherit">${context}</pre>
          <p>Detail lengkap: ${process.env.APP_URL ?? ""}/events/${event.id}/workspace</p>
          <p>— Sistem Kepanitiaan HMIF</p>`,
      });
      if (status === "sent" || status === "mocked") sent++;
    }
  }
  return sent;
}
