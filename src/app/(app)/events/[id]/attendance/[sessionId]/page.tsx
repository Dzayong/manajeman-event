import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";
import { SessionScreen } from "./session-screen";

export const metadata = { title: "Sesi presensi — Sistem Kepanitiaan HMIF" };

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await requireSession();
  const { id, sessionId } = await params;
  const eventId = Number(id);
  const attSessionId = Number(sessionId);
  if (Number.isNaN(eventId) || Number.isNaN(attSessionId)) notFound();

  const attendanceSession = await db.attendanceSession.findUnique({
    where: { id: attSessionId },
    include: {
      event: { select: { id: true, name: true } },
      attendances: {
        include: {
          user: { select: { id: true, name: true } },
          markedBy: { select: { name: true } },
        },
        orderBy: { checkedInAt: "desc" },
      },
    },
  });
  if (!attendanceSession || attendanceSession.eventId !== eventId) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access || !canOperateEvent(access)) {
    redirect(`/events/${eventId}/workspace`);
  }

  const presentIds = new Set(attendanceSession.attendances.map((a) => a.user.id));
  const absentMembers = await db.membership.findMany({
    where: { eventId, userId: { notIn: [...presentIds] } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });

  return (
    <div>
      <Link
        href={`/events/${eventId}/workspace`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {attendanceSession.event.name}
      </Link>

      <SessionScreen
        sessionId={attendanceSession.id}
        title={attendanceSession.title}
        mode={attendanceSession.mode}
        status={attendanceSession.status}
        attendances={attendanceSession.attendances.map((a) => ({
          userId: a.user.id,
          name: a.user.name,
          method: a.method,
          markedBy: a.markedBy?.name ?? null,
          checkedInAt: a.checkedInAt.toISOString(),
        }))}
        absentMembers={absentMembers.map((m) => ({
          id: m.user.id,
          name: m.user.name,
        }))}
      />
    </div>
  );
}
