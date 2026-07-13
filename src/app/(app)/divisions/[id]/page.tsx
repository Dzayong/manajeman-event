import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import {
  getEventAccess,
  canViewDivision,
  canEditDivision,
} from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskBoard } from "./task-board";
import { DocumentsPanel } from "./documents-panel";
import { MembersActivity } from "./members-activity";

export const metadata = { title: "Workspace divisi — Sistem Kepanitiaan HMIF" };

export default async function DivisionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const divisionId = Number(id);
  if (Number.isNaN(divisionId)) notFound();

  const division = await db.division.findUnique({
    where: { id: divisionId },
    include: {
      event: { select: { id: true, name: true } },
      tasks: {
        include: {
          pic: { select: { id: true, name: true } },
          checklistItems: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: [{ deadline: "asc" }, { id: "asc" }],
      },
      documents: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      memberships: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!division) notFound();

  const access = await getEventAccess(session, division.event.id);
  if (!access || !canViewDivision(access, divisionId)) redirect("/dashboard");
  const editable = canEditDivision(access, divisionId);

  const doneCount = division.tasks.filter((t) => t.status === "DONE").length;
  const progress =
    division.tasks.length === 0
      ? 0
      : Math.round((doneCount / division.tasks.length) * 100);

  const memberIds = division.memberships.map((m) => m.user.id);

  const [taskStats, lastActivities, attendanceCounts] = await Promise.all([
    db.task.groupBy({
      by: ["picUserId", "status"],
      where: { divisionId, picUserId: { in: memberIds } },
      _count: { _all: true },
    }),
    db.activityLog.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds }, eventId: division.event.id },
      _max: { createdAt: true },
    }),
    db.attendance.groupBy({
      by: ["userId"],
      where: {
        userId: { in: memberIds },
        session: { eventId: division.event.id },
      },
      _count: { _all: true },
    }),
  ]);

  const overdueTasks = await db.task.groupBy({
    by: ["picUserId"],
    where: {
      divisionId,
      picUserId: { in: memberIds },
      status: { not: "DONE" },
      deadline: { lt: new Date() },
    },
    _count: { _all: true },
  });

  const members = division.memberships.map((m) => {
    const stats = taskStats.filter((s) => s.picUserId === m.user.id);
    const total = stats.reduce((sum, s) => sum + s._count._all, 0);
    const done =
      stats.find((s) => s.status === "DONE")?._count._all ?? 0;
    const overdue =
      overdueTasks.find((o) => o.picUserId === m.user.id)?._count._all ?? 0;
    const lastActive =
      lastActivities.find((a) => a.userId === m.user.id)?._max.createdAt ??
      null;
    const attended =
      attendanceCounts.find((a) => a.userId === m.user.id)?._count._all ?? 0;
    return {
      userId: m.user.id,
      name: m.user.name,
      username: m.user.username,
      position: m.position,
      taskTotal: total,
      taskDone: done,
      taskOverdue: overdue,
      lastActive: lastActive ? lastActive.toISOString() : null,
      attended,
    };
  });

  return (
    <div>
      <Link
        href={access.isPengurus ? `/events/${division.event.id}` : "/dashboard"}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {division.event.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Divisi {division.name}
          </h1>
          {access.readOnly && (
            <Badge variant="secondary">
              <Eye className="mr-1 h-3 w-3" />
              Hanya lihat (SC)
            </Badge>
          )}
        </div>
        <div className="w-full max-w-56">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium text-slate-900">
              {progress}% · {doneCount}/{division.tasks.length} tugas
            </span>
          </div>
          <Progress value={progress} className="mt-1 h-2" />
        </div>
      </div>

      <Tabs defaultValue="tasks" className="mt-6">
        <TabsList>
          <TabsTrigger value="tasks">
            Tugas ({division.tasks.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Dokumen ({division.documents.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            Anggota ({division.memberships.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskBoard
            divisionId={division.id}
            canEdit={editable}
            members={division.memberships.map((m) => ({
              id: m.user.id,
              name: m.user.name,
            }))}
            tasks={division.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              deadline: t.deadline ? t.deadline.toISOString() : null,
              pic: t.pic ? { id: t.pic.id, name: t.pic.name } : null,
              checklist: t.checklistItems.map((c) => ({
                id: c.id,
                label: c.label,
                isDone: c.isDone,
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel
            divisionId={division.id}
            canEdit={editable}
            documents={division.documents.map((d) => ({
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

        <TabsContent value="members" className="mt-4">
          <MembersActivity members={members} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
