import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePengurus } from "@/lib/authz";
import { ImportWizard } from "./import-wizard";

export const metadata = { title: "Import panitia — Sistem Kepanitiaan HMIF" };

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePengurus();
  const { id } = await params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) notFound();

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { divisions: { orderBy: { id: "asc" } } },
  });
  if (!event) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Import panitia — {event.name}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Upload spreadsheet hasil oprek (.xlsx / .csv dari Google Form) atau
        tambah baris manual. Periksa dan rapikan datanya, lalu sistem
        membuatkan akun untuk semua anggota sekaligus.
      </p>
      <div className="mt-6">
        <ImportWizard
          eventId={event.id}
          eventName={event.name}
          divisions={event.divisions.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  );
}
