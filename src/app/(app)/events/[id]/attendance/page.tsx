import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";
import { AttendancePanel } from "../workspace/attendance-panel";

export const metadata = { title: "Presensi panitia — Sistem Kepanitiaan HMIF" };

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access) redirect("/dashboard");

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      _count: { select: { memberships: true } },
      attendanceSessions: {
        include: { _count: { select: { attendances: true } } },
        orderBy: { openedAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Presensi Panitia
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Buka sesi presensi dan pantau kehadiran panitia per agenda.
        </p>
      </div>

      <AttendancePanel
        eventId={eventId}
        canOperate={canOperateEvent(access)}
        memberCount={event._count.memberships}
        sessions={event.attendanceSessions.map((s) => ({
          id: s.id,
          title: s.title,
          mode: s.mode,
          status: s.status,
          openedAt: s.openedAt.toISOString(),
          attendeeCount: s._count.attendances,
        }))}
      />
    </div>
  );
}
