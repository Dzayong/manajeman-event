"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Users,
  Wallet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DivisionLink = { id: number; name: string };

type Props = {
  eventId: number;
  eventName: string;
  divisions: DivisionLink[];
  canManageEvent: boolean;
  canManageFinance: boolean;
};

function NavLinks({
  eventId,
  divisions,
  canManageEvent,
  canManageFinance,
  onNavigate,
}: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const workspaceHref = `/events/${eventId}/workspace`;
  const announcementsHref = `/events/${eventId}/announcements`;
  const documentsHref = `/events/${eventId}/documents`;
  const attendanceHref = `/events/${eventId}/attendance`;
  const financeHref = `/events/${eventId}/finance`;
  const settingsHref = `/events/${eventId}`;
  const proposalHref = `/events/${eventId}/proposal`;

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
      active
        ? "bg-red-50/75 border-l-2 border-primary text-primary pl-2.5 rounded-l-none"
        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
    );

  const sectionClass =
    "px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-slate-400";

  return (
    <nav className="space-y-1">
      <Link
        href={workspaceHref}
        onClick={onNavigate}
        className={linkClass(pathname === workspaceHref)}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        Ringkasan
      </Link>
      <Link
        href={announcementsHref}
        onClick={onNavigate}
        className={linkClass(pathname.startsWith(announcementsHref))}
      >
        <Megaphone className="h-4 w-4 shrink-0" />
        Pengumuman
      </Link>
      <Link
        href={documentsHref}
        onClick={onNavigate}
        className={linkClass(pathname.startsWith(documentsHref))}
      >
        <FolderOpen className="h-4 w-4 shrink-0" />
        Dokumen
      </Link>
      <Link
        href={attendanceHref}
        onClick={onNavigate}
        className={linkClass(pathname.startsWith(attendanceHref))}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        Presensi
      </Link>

      {divisions.length > 0 && (
        <div>
          <p className={sectionClass}>Divisi</p>
          {divisions.map((d) => {
            const href = `/divisions/${d.id}`;
            return (
              <Link
                key={d.id}
                href={href}
                onClick={onNavigate}
                className={linkClass(pathname === href)}
              >
                <Users className="h-4 w-4 shrink-0" />
                {d.name}
              </Link>
            );
          })}
        </div>
      )}

      <div>
        <p className={sectionClass}>Administrasi</p>
        <Link
          href={proposalHref}
          onClick={onNavigate}
          className={linkClass(
            pathname.startsWith(proposalHref) ||
              pathname.startsWith(`/events/${eventId}/surat`),
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          Proposal &amp; Surat
        </Link>
        {canManageFinance && (
          <Link
            href={financeHref}
            onClick={onNavigate}
            className={linkClass(pathname.startsWith(financeHref))}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            Keuangan
          </Link>
        )}
        {canManageEvent && (
          <Link
            href={settingsHref}
            onClick={onNavigate}
            className={linkClass(pathname === settingsHref)}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Panitia &amp; Pengaturan
          </Link>
        )}
      </div>
    </nav>
  );
}

export function EventSidebarNav(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
<<<<<<< HEAD
      {/* Desktop: static column */}
      <aside className="hidden w-56 shrink-0 bg-white/70 backdrop-blur-md border border-slate-200/40 rounded-2xl p-4 shadow-sm h-fit lg:block print:hidden">
        <p className="mb-3 truncate px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
=======
      {/* Desktop: column pinned below the header so the map never scrolls away */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 self-start overflow-y-auto border-r bg-white px-3 py-4 lg:block print:hidden">
        <p className="mb-3 truncate px-3 text-sm font-semibold text-slate-900">
>>>>>>> 8c9e157 (Update fitur kepanitiaan)
          {props.eventName}
        </p>
        <NavLinks {...props} />
      </aside>

      {/* Mobile: drawer behind a menu button */}
      <div className="sticky top-14 z-30 border-b bg-white px-4 py-2 lg:hidden print:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="mr-1 h-4 w-4" />
              Menu event
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 px-3 py-4">
            <SheetHeader className="px-3">
              <SheetTitle className="truncate text-left">
                {props.eventName}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-2">
              <NavLinks {...props} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
