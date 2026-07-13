import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { ReportEditor } from "./report-editor";

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

  return (
    <div>
      <Link
        href={`/events/${eventId}/workspace`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {report.event.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {report.type === "LPJ_DRAFT" ? "Draft LPJ" : "Ringkasan progress"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Dibuat AI{" "}
        {report.createdAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        — silakan edit sesuai kebutuhan lalu simpan.
      </p>
      <div className="mt-6">
        <ReportEditor
          reportId={report.id}
          content={report.content}
          editable={access.canManageEvent}
        />
      </div>
    </div>
  );
}
