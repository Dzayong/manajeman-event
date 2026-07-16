import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { getReportPhotos } from "@/lib/report-photos";
import { Button } from "@/components/ui/button";
import { ReportWorkspace } from "./report-workspace";

export const metadata = { title: "Laporan — Sistem Kepanitiaan HMIF" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const session = await requireSession();
  const { id, reportId } = await params;
  const eventId = Number(id);
  const repId = Number(reportId);
  if (Number.isNaN(eventId) || Number.isNaN(repId)) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access) redirect("/dashboard");

  const report = await db.report.findUnique({
    where: { id: repId },
    include: { event: { select: { name: true } } },
  });
  if (!report || report.eventId !== eventId) notFound();

  const [photos, ketuaPelaksana] = await Promise.all([
    report.type === "LPJ_DRAFT"
      ? getReportPhotos(eventId)
      : Promise.resolve({ receipts: [], documentation: [] }),
    report.type === "LPJ_DRAFT"
      ? db.membership
          .findFirst({
            where: { eventId, position: "KETUA_PANITIA" },
            select: { user: { select: { name: true } } },
          })
          .then((m) => m?.user.name ?? null)
      : Promise.resolve(null),
  ]);

  const createdAtLabel = report.createdAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <Link
        href={`/events/${eventId}/workspace`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {report.event.name}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {report.type === "LPJ_DRAFT" ? "Draft LPJ" : "Ringkasan progress"}
        </h1>
        {report.type === "LPJ_DRAFT" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${eventId}/reports/${report.id}/lampiran`}>
              <ImageIcon className="mr-1.5 h-4 w-4" />
              Lampiran Foto
            </Link>
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Dibuat AI {createdAtLabel} — minta AI merevisi lewat chat, atau edit
        langsung di sebelah kiri.
      </p>
      <div className="mt-6">
        <ReportWorkspace
          reportId={report.id}
          type={report.type}
          initialContent={report.content}
          editable={access.canManageEvent}
          eventName={report.event.name}
          createdAt={createdAtLabel}
          photos={photos}
          ketuaPelaksana={ketuaPelaksana}
        />
      </div>
    </div>
  );
}
