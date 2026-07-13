import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canManageFinance } from "@/lib/permissions";
import { FinanceClient } from "./finance-client";

export const metadata = { title: "Keuangan — Sistem Kepanitiaan HMIF" };

export default async function FinancePage({
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
  const editable = canManageFinance(access);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      divisions: { orderBy: { id: "asc" } },
      rabItems: {
        include: { division: { select: { name: true } } },
        orderBy: [{ divisionId: "asc" }, { id: "asc" }],
      },
      financeRecords: {
        include: {
          division: { select: { name: true } },
          rabItem: { select: { id: true, itemName: true } },
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const realizationByRab = await db.financeRecord.groupBy({
    by: ["rabItemId"],
    where: { eventId, status: "CONFIRMED" },
    _sum: { totalAmount: true },
  });
  const realizationMap = new Map(
    realizationByRab.map((r) => [r.rabItemId, Number(r._sum.totalAmount ?? 0)]),
  );

  return (
    <div>
      <Link
        href={`/events/${eventId}/workspace`}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {event.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Keuangan</h1>
      <p className="mt-1 text-sm text-slate-500">
        RAB → foto struk → realisasi, semuanya terekam untuk LPJ.
      </p>

      <div className="mt-6">
        <FinanceClient
          eventId={eventId}
          editable={editable}
          divisions={event.divisions.map((d) => ({ id: d.id, name: d.name }))}
          rabItems={event.rabItems.map((r) => ({
            id: r.id,
            itemName: r.itemName,
            divisionName: r.division?.name ?? null,
            divisionId: r.divisionId,
            quantity: r.quantity,
            unitPrice: Number(r.unitPrice),
            subtotal: Number(r.subtotal),
            note: r.note,
            realized: realizationMap.get(r.id) ?? 0,
          }))}
          records={event.financeRecords.map((r) => ({
            id: r.id,
            totalAmount: Number(r.totalAmount),
            status: r.status,
            note: r.note,
            divisionName: r.division?.name ?? null,
            rabItemName: r.rabItem?.itemName ?? null,
            uploadedBy: r.uploadedBy?.name ?? null,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
