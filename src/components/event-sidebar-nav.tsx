"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  const financeHref = `/events/${eventId}/finance`;
  const settingsHref = `/events/${eventId}`;
  const proposalHref = `/events/${eventId}/proposal`;

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-red-50 font-medium text-red-700"
        : "text-slate-600 hover:bg-slate-100",
    );

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
        href={proposalHref}
        onClick={onNavigate}
        className={linkClass(pathname.startsWith(proposalHref) || pathname.startsWith(`/events/${eventId}/surat`))}
      >
        <FileText className="h-4 w-4 shrink-0" />
        Proposal &amp; Surat
      </Link>

      {divisions.length > 0 && (
        <div className="pt-2">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Divisi
          </p>
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

      {(canManageFinance || canManageEvent) && (
        <div className="space-y-1 pt-2">
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
      )}
    </nav>
  );
}

export function EventSidebarNav(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: static column */}
      <aside className="hidden w-56 shrink-0 border-r bg-white px-3 py-4 lg:block print:hidden">
        <p className="mb-3 truncate px-3 text-sm font-semibold text-slate-900">
          {props.eventName}
        </p>
        <NavLinks {...props} />
      </aside>

      {/* Mobile: drawer behind a menu button */}
      <div className="border-b bg-white px-4 py-2 lg:hidden print:hidden">
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
