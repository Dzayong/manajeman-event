import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { ProposalForm } from "./proposal-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Proposal Event — Sistem Kepanitiaan HMIF" };

export default async function ProposalPage({
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
      rabItems: {
        include: { division: { select: { name: true } } },
        orderBy: [{ divisionId: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!event) notFound();

  const proposal = await db.proposal.findUnique({
    where: { eventId },
    include: {
      reviewedBy: { select: { name: true } },
    },
  });

  const totalBudget = event.rabItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0,
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/events/${eventId}/workspace`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Workspace
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Proposal &amp; Administrasi Surat
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola dokumen proposal dan cetak surat resmi untuk event **{event.name}**
        </p>
      </div>

      <ProposalForm
        eventId={eventId}
        proposal={proposal}
        isPengurus={access.isPengurus}
        canManage={access.canManageEvent}
      />

      {/* Rencana Anggaran Biaya (RAB) Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-500" />
            Rencana Anggaran Biaya (RAB) Lampiran
          </CardTitle>
          <CardDescription>
            Berikut adalah rekap pos anggaran yang diinput di menu Keuangan dan akan dilampirkan otomatis ke proposal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {event.rabItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Belum ada pos anggaran (RAB) yang diinput di menu Keuangan.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Item</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-center">Kuantitas</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.rabItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-slate-900">{item.itemName}</TableCell>
                        <TableCell>{item.division?.name ?? "Umum"}</TableCell>
                        <TableCell className="text-right">
                          Rp{Number(item.unitPrice).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          Rp{Number(item.subtotal).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pr-4 text-sm font-bold text-slate-900">
                Total Estimasi Anggaran: Rp{totalBudget.toLocaleString("id-ID")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
