import { requirePengurus } from "@/lib/authz";
import { CreateEventForm } from "./create-event-form";

export const metadata = { title: "Buat event — Sistem Kepanitiaan HMIF" };

export default async function NewEventPage() {
  await requirePengurus();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Buat event</h1>
      <p className="mt-1 text-sm text-slate-500">
        Isi detail event lalu susun divisi kepanitiaannya.
      </p>
      <div className="mt-6">
        <CreateEventForm />
      </div>
    </div>
  );
}
