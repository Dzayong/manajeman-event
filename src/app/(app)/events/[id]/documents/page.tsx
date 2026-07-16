import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { EventDocumentsPanel } from "../workspace/event-documents-panel";

export const metadata = { title: "Dokumen event — Sistem Kepanitiaan HMIF" };

export default async function EventDocumentsPage({
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
      documents: {
        where: { divisionId: null },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dokumen Bersama
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Berkas resmi milik event yang bisa diakses lintas divisi.
        </p>
      </div>

      <EventDocumentsPanel
        eventId={eventId}
        canManage={access.canManageEvent}
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
    </div>
  );
}
