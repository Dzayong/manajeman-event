import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canOperateEvent } from "@/lib/permissions";
import { AnnouncementsPanel } from "@/components/announcements-panel";

export const metadata = { title: "Pengumuman — Sistem Kepanitiaan HMIF" };

export default async function EventAnnouncementsPage({
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
      divisions: { select: { id: true, name: true }, orderBy: { id: "asc" } },
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
    },
  });
  if (!event) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengumuman
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Info lintas-divisi yang perlu diketahui semua atau beberapa tim.
        </p>
      </div>

      <AnnouncementsPanel
        eventId={eventId}
        canOperate={canOperateEvent(access)}
        showForm
        showHeader={false}
        divisions={event.divisions.map((d) => ({ id: d.id, name: d.name }))}
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
    </div>
  );
}
