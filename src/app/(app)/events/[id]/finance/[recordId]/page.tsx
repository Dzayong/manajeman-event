import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canManageFinance } from "@/lib/permissions";
import { RecordEditor } from "./record-editor";

export const metadata = { title: "Rincian struk — Sistem Kepanitiaan HMIF" };

export default async function FinanceRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const session = await requireSession();
  const { id, recordId } = await params;
  const eventId = Number(id);
  const finRecordId = Number(recordId);
  if (Number.isNaN(eventId) || Number.isNaN(finRecordId)) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access) redirect("/dashboard");

  const record = await db.financeRecord.findUnique({
    where: { id: finRecordId },
    include: {
      items: { orderBy: { id: "asc" } },
      event: {
        include: {
          divisions: { orderBy: { id: "asc" } },
          rabItems: { orderBy: { id: "asc" } },
        },
      },
    },
  });
  if (!record || record.eventId !== eventId) notFound();

  return (
    <div>
      <Link
        href={`/events/${eventId}/finance`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Keuangan {record.event.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        Rincian struk
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Hasil pembacaan AI — periksa dan perbaiki sebelum dikonfirmasi.
      </p>

      <div className="mt-6">
        <RecordEditor
          eventId={eventId}
          editable={canManageFinance(access) && record.status === "DRAFT"}
          record={{
            id: record.id,
            receiptUrl: record.receiptUrl,
            status: record.status,
            note: record.note ?? "",
            divisionId: record.divisionId,
            rabItemId: record.rabItemId,
            items: record.items.map((i) => ({
              itemName: i.itemName,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
            })),
          }}
          divisions={record.event.divisions.map((d) => ({
            id: d.id,
            name: d.name,
          }))}
          rabItems={record.event.rabItems.map((r) => ({
            id: r.id,
            name: r.itemName,
          }))}
        />
      </div>
    </div>
  );
}
