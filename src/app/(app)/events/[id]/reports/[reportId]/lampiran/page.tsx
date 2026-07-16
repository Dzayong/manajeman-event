import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { getReportPhotos } from "@/lib/report-photos";
import { LampiranClient } from "./lampiran-client";

export const metadata = { title: "Lampiran Foto — Sistem Kepanitiaan HMIF" };

export default async function LampiranPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const session = await requireSession();
  const { id, reportId } = await params;
  const eventId = Number(id);
  const reportIdNum = Number(reportId);
  if (Number.isNaN(eventId) || Number.isNaN(reportIdNum)) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access) redirect("/dashboard");

  const [event, report, photos] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { name: true } }),
    db.report.findUnique({ where: { id: reportIdNum }, select: { id: true, eventId: true, type: true } }),
    getReportPhotos(eventId),
  ]);
  if (!event || !report || report.eventId !== eventId) notFound();

  return (
    <LampiranClient
      eventId={eventId}
      reportId={report.id}
      eventName={event.name}
      receipts={photos.receipts}
      documentation={photos.documentation}
    />
  );
}
