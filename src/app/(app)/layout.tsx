import Link from "next/link";
import { requireSession } from "@/lib/authz";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              H
            </span>
            Kepanitiaan HMIF
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-slate-600">{session.name}</span>
              <Badge variant="secondary">
                {session.role === "PENGURUS" ? "Pengurus" : "Panitia"}
              </Badge>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
