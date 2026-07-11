import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard — Sistem Kepanitiaan HMIF" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Halo, {session.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{session.role}</Badge>
            <span className="text-sm text-slate-500">@{session.username}</span>
          </div>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Keluar
          </Button>
        </form>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Milestone 0 selesai — daftar event akan tampil di sini (M1).
      </p>
    </main>
  );
}
