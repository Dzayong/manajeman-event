import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Eye, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";
import { POSITION_LABELS } from "@/lib/positions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MilestonesPanel } from "./milestones-panel";
import { AttendancePanel } from "./attendance-panel";
import { AiPanel } from "./ai-panel";
import { EventDocumentsPanel } from "./event-documents-panel";

export const metadata = { title: "Workspace event — Sistem Kepanitiaan HMIF" };

export default async function EventWorkspacePage({
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
    include: {
      divisions: {
        include: {
          tasks: { select: { status: true } },
          _count: { select: { memberships: true } },
        },
        orderBy: { id: "asc" },
      },
      milestones: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] },
      attendanceSessions: {
        include: { _count: { select: { attendances: true } } },
        orderBy: { openedAt: "desc" },
      },
      memberships: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
      reports: { orderBy: { createdAt: "desc" }, take: 5 },
      documents: {
        where: { divisionId: null },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const operator = canOperateEvent(access);
  const manager = access.canManageEvent;

  const totalTasks = event.divisions.reduce(
    (sum, d) => sum + d.tasks.length,
    0,
  );
  const doneTasks = event.divisions.reduce(
    (sum, d) => sum + d.tasks.filter((t) => t.status === "DONE").length,
    0,
  );
  const overall =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {event.name}
          </h1>
          {access.readOnly && (
            <Badge variant="secondary">
              <Eye className="mr-1 h-3 w-3" />
              Hanya lihat (SC)
            </Badge>
          )}
          {access.position && (
            <Badge>{POSITION_LABELS[access.position]}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${event.id}/finance`}>
              <Wallet className="mr-1 h-4 w-4" />
              Keuangan
            </Link>
          </Button>
          <div className="w-44">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Progress</span>
              <span className="font-medium text-slate-900">{overall}%</span>
            </div>
            <Progress value={overall} className="mt-1 h-2" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <EventDocumentsPanel
            eventId={event.id}
            canManage={manager}
            documents={event.documents.map((d) => ({
              id: d.id,
              title: d.title,
              type: d.type,
              url: d.url,
              uploadedBy: d.uploadedBy?.name ?? null,
              createdAt: d.createdAt.toISOString(),
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress per divisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.divisions.length === 0 && (
                <p className="text-sm text-slate-500">Belum ada divisi.</p>
              )}
              {event.divisions.map((d) => {
                const total = d.tasks.length;
                const done = d.tasks.filter((t) => t.status === "DONE").length;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <Link
                    key={d.id}
                    href={`/divisions/${d.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:border-slate-400"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        {done}/{total} tugas · {d._count.memberships} anggota
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2 h-2" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <AttendancePanel
            eventId={event.id}
            canOperate={operator}
            sessions={event.attendanceSessions.map((s) => ({
              id: s.id,
              title: s.title,
              mode: s.mode,
              status: s.status,
              openedAt: s.openedAt.toISOString(),
              attendeeCount: s._count.attendances,
            }))}
            memberCount={event.memberships.length}
          />
        </div>

        <div className="space-y-6">
          <MilestonesPanel
            eventId={event.id}
            canManage={manager}
            milestones={event.milestones.map((m) => ({
              id: m.id,
              title: m.title,
              dueDate: m.dueDate ? m.dueDate.toISOString() : null,
              isDone: m.isDone,
            }))}
          />
          <AiPanel
            eventId={event.id}
            canManage={manager}
            isPengurus={access.isPengurus}
            reports={event.reports.map((r) => ({
              id: r.id,
              type: r.type,
              createdAt: r.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
