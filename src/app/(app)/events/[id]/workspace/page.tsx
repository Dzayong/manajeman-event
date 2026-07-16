import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Eye, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";
import { POSITION_LABELS } from "@/lib/positions";
import { avatarColor, initials } from "@/lib/avatar-color";
import { computeQuickVerdict, VERDICT_STYLE } from "@/lib/event-verdict";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart } from "@/components/donut-chart";
import { StatusBar } from "@/components/status-bar";
import { AnnouncementsPanel } from "@/components/announcements-panel";
import { ActivityFeedPanel } from "@/components/activity-feed-panel";
import { MilestonesPanel } from "./milestones-panel";
import { AttendancePanel } from "./attendance-panel";
import { AiPanel } from "./ai-panel";
import { EventDocumentsPanel } from "./event-documents-panel";
import { CountdownCard } from "@/components/countdown-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      divisions: {
        include: {
          tasks: {
            select: {
              status: true,
              title: true,
              deadline: true,
              pic: { select: { name: true } },
            },
          },
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
      announcements: {
        include: {
          createdBy: { select: { name: true } },
          targets: {
            include: { division: { select: { id: true, name: true } } },
            orderBy: { divisionId: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      activityLogs: {
        where: { createdAt: { gte: oneDayAgo } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!event) notFound();

  const operator = canOperateEvent(access);
  const manager = access.canManageEvent;

  const allTasks = event.divisions.flatMap((d) =>
    d.tasks.map((t) => ({ ...t, divisionName: d.name })),
  );
  const doneTasks = allTasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = allTasks.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const todoTasks = allTasks.filter((t) => t.status === "TODO").length;

  const overdueTasks = allTasks
    .filter((t) => t.status !== "DONE" && t.deadline && t.deadline < now)
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());

  const stalledDivisionNames = event.divisions
    .filter(
      (d) =>
        d.tasks.length > 0 &&
        d.tasks.every((t) => t.status === "TODO"),
    )
    .map((d) => d.name);

  const verdict = computeQuickVerdict({
    overdueCount: overdueTasks.length,
    stalledDivisionNames,
  });
  const divisionNames = new Map(event.divisions.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {event.name}
          </h1>
          {access.readOnly && (
            <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-800 border-slate-200">
              <Eye className="h-3 w-3" />
              Hanya lihat (SC)
            </Badge>
          )}
          {access.position && (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              {POSITION_LABELS[access.position]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${event.id}/finance`}>
              <Wallet className="mr-1.5 h-4 w-4" />
              Keuangan (RAB)
            </Link>
          </Button>
          {allTasks.length > 0 && (
            <DonutChart
              size={64}
              segments={[
                { label: "To-do", value: todoTasks, colorClass: "text-slate-300" },
                {
                  label: "Dikerjakan",
                  value: inProgressTasks,
                  colorClass: "text-amber-400",
                },
                {
                  label: "Selesai",
                  value: doneTasks,
                  colorClass: "text-emerald-500",
                },
              ]}
            />
          )}
        </div>
      </div>

      <div
        className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${VERDICT_STYLE[verdict.level]}`}
      >
        {verdict.text}
      </div>

      {/* Modern Tabs Navigation */}
      <Tabs defaultValue="ringkasan" className="w-full">
        {/* Scrollable list on mobile */}
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="flex w-max min-w-full md:w-full md:grid md:grid-cols-5 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="ringkasan" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="divisi" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Divisi &amp; Tugas
            </TabsTrigger>
            <TabsTrigger value="pengumuman" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Pengumuman (Blast)
            </TabsTrigger>
            <TabsTrigger value="dokumen" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Dokumen Bersama
            </TabsTrigger>
            <TabsTrigger value="absensi" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Presensi Panitia
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="ringkasan" className="mt-6 space-y-6">
          <CountdownCard
            startDate={event.startDate ? event.startDate.toISOString() : null}
            eventName={event.name}
            milestones={event.milestones.map((m) => ({
              id: m.id,
              title: m.title,
              dueDate: m.dueDate ? m.dueDate.toISOString() : null,
              isDone: m.isDone,
            }))}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
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
              {overdueTasks.length > 0 && (
                <Card className="border-red-200 bg-red-50/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-red-800">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Perlu Perhatian (Tugas Telat)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overdueTasks.slice(0, 3).map((t, i) => {
                      const picName = t.pic?.name ?? null;
                      const color = picName ? avatarColor(picName) : null;
                      const daysLate = Math.floor(
                        (now.getTime() - t.deadline!.getTime()) / 86_400_000,
                      );
                      return (
                        <div key={i} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                          <span
                            title={picName ?? "Belum ada PIC"}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              color
                                ? `${color.bg} ${color.text}`
                                : "border border-dashed border-slate-300 text-slate-400"
                            }`}
                          >
                            {picName ? initials(picName) : "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {t.title}
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                              Divisi {t.divisionName} · Telat {daysLate} hari
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {overdueTasks.length > 3 && (
                      <p className="text-xs text-slate-500 font-medium pt-1">
                        +{overdueTasks.length - 3} tugas telat lainnya
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-6">
              <ActivityFeedPanel
                activities={event.activityLogs.map((activity) => ({
                  id: activity.id,
                  action: activity.action,
                  detail: activity.detail,
                  createdAt: activity.createdAt.toISOString(),
                  userName: activity.user.name,
                  divisionName: activity.divisionId
                    ? (divisionNames.get(activity.divisionId) ?? null)
                    : null,
                }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="divisi" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Progress per Divisi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {event.divisions.length === 0 && (
                <p className="text-sm text-slate-500 col-span-2 py-6 text-center">Belum ada divisi.</p>
              )}
              {event.divisions.map((d) => {
                const total = d.tasks.length;
                const done = d.tasks.filter((t) => t.status === "DONE").length;
                const inProgress = d.tasks.filter(
                  (t) => t.status === "IN_PROGRESS",
                ).length;
                const todo = d.tasks.filter((t) => t.status === "TODO").length;
                return (
                  <Link
                    key={d.id}
                    href={`/divisions/${d.id}`}
                    className="block rounded-lg border p-4 transition-all duration-200 hover:border-slate-400 hover:shadow-sm bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-900">{d.name}</p>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {done}/{total} tugas · {d._count.memberships} panitia
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <StatusBar todo={todo} inProgress={inProgress} done={done} />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pengumuman" className="mt-6">
          <AnnouncementsPanel
            eventId={event.id}
            canOperate={operator}
            showForm
            divisions={event.divisions.map((d) => ({
              id: d.id,
              name: d.name,
            }))}
            announcements={event.announcements.map((a) => ({
              id: a.id,
              title: a.title,
              body: a.body,
              deadline: a.deadline ? a.deadline.toISOString() : null,
              createdAt: a.createdAt.toISOString(),
              createdBy: a.createdBy?.name ?? null,
              targetDivisions: a.targets.map((target) => ({
                id: target.division.id,
                name: target.division.name,
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="dokumen" className="mt-6">
          <EventDocumentsPanel
            eventId={event.id}
            canManage={manager}
            documents={event.documents.map((d) => ({
              id: d.id,
              title: d.title,
              type: d.type,
              url: d.url,
              category: d.category,
              uploadedBy: d.uploadedBy?.name ?? null,
              createdAt: d.createdAt.toISOString(),
            }))}
          />
        </TabsContent>

        <TabsContent value="absensi" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
