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
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="sticky top-0 z-50 border-b border-slate-200/40 bg-white/75 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 font-bold text-slate-900 transition-all"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-rose-500 text-[11px] font-black text-white shadow-sm shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
              H
            </span>
            Kepanitiaan HMIF
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium text-slate-700">{session.name}</span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-semibold border-0 hover:bg-slate-200">
                {session.role === "PENGURUS" ? "Pengurus" : "Panitia"}
              </Badge>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg">
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
