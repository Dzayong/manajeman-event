import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { POSITION_LABELS } from "@/lib/positions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Dashboard — Sistem Kepanitiaan HMIF" };

const STATUS_LABELS = {
  DRAFT: "Draft",
  ONGOING: "Berjalan",
  DONE: "Selesai",
} as const;

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await requireSession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { mustResetPassword: true },
  });
  if (user?.mustResetPassword) redirect("/onboarding");

  if (session.role === "PENGURUS") {
    const events = await db.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { divisions: true, memberships: true } },
      },
    });

    const pendingProposals = await db.proposal.findMany({
      where: { status: "SUBMITTED" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const activeEvents = events.filter((e) => e.status !== "DONE");
    const archivedEvents = events.filter((e) => e.status === "DONE");

    const renderEventList = (eventList: typeof events) => {
      if (eventList.length === 0) {
        return (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="mt-4 font-medium text-slate-900">Tidak ada event</p>
              <p className="mt-1 text-sm text-slate-500">
                Belum ada data event di kategori ini.
              </p>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {eventList.map((event) => (
            <Link key={event.id} href={`/events/${event.id}/workspace`}>
              <Card className="h-full transition-colors hover:border-slate-400">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <Badge
                      variant={
                        event.status === "ONGOING" ? "default" : "secondary"
                      }
                    >
                      {STATUS_LABELS[event.status]}
                    </Badge>
                  </div>
                  {event.description && (
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(event.startDate)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event._count.memberships} panitia ·{" "}
                    {event._count.divisions} divisi
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      );
    };

    const renderProposalList = (proposalList: typeof pendingProposals) => {
      if (proposalList.length === 0) {
        return (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="mt-4 font-medium text-slate-900">Tidak ada pengajuan</p>
              <p className="mt-1 text-sm text-slate-500">
                Belum ada proposal baru yang perlu ditinjau.
              </p>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="mt-4 space-y-3">
          {proposalList.map((p) => (
            <Card key={p.id}>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Proposal: {p.tema || "Tanpa Tema"}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-slate-500">
                      Event: <span className="font-semibold">{p.event.name}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Menunggu Review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 border-t">
                <span>
                  Diajukan pada: {p.submittedAt ? formatDate(p.submittedAt) : "-"}
                </span>
                <Button asChild size="sm">
                  <Link href={`/events/${p.event.id}/proposal`}>
                    Tinjau Proposal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    };

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Event</h1>
            <p className="mt-1 text-sm text-slate-500">
              Semua event himpunan dan kepanitiaannya
            </p>
          </div>
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-1 h-4 w-4" />
              Buat event
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300" />
              <p className="mt-4 font-medium text-slate-900">
                Belum ada event
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Mulai dengan membuat event pertama dan menyusun divisinya.
              </p>
              <Button asChild className="mt-4">
                <Link href="/events/new">
                  <Plus className="mr-1 h-4 w-4" />
                  Buat event
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="mt-6 w-full">
            <TabsList className="grid w-full max-w-[600px] grid-cols-3">
              <TabsTrigger value="active">
                Event Aktif ({activeEvents.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Arsip Event ({archivedEvents.length})
              </TabsTrigger>
              <TabsTrigger value="proposals">
                Persetujuan ({pendingProposals.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {renderEventList(activeEvents)}
            </TabsContent>
            <TabsContent value="archived">
              {renderEventList(archivedEvents)}
            </TabsContent>
            <TabsContent value="proposals">
              {renderProposalList(pendingProposals)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  const memberships = await db.membership.findMany({
    where: { userId: session.userId },
    include: { event: true, division: true },
    orderBy: { event: { createdAt: "desc" } },
  });

  const activeMemberships = memberships.filter((m) => m.event.status !== "DONE");
  const archivedMemberships = memberships.filter((m) => m.event.status === "DONE");

  const renderMembershipList = (membershipList: typeof memberships) => {
    if (membershipList.length === 0) {
      return (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-medium text-slate-900">Tidak ada kepanitiaan</p>
            <p className="mt-1 text-sm text-slate-500">
              Belum ada data kepanitiaan di kategori ini.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {membershipList.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{m.event.name}</CardTitle>
                <Badge variant="secondary">
                  {STATUS_LABELS[m.event.status]}
                </Badge>
              </div>
              <CardDescription>
                {POSITION_LABELS[m.position]}
                {m.division ? ` · Divisi ${m.division.name}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {m.division && (
                <Button asChild size="sm">
                  <Link href={`/divisions/${m.division.id}`}>
                    Workspace divisi
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href={`/events/${m.event.id}/workspace`}>
                  Ringkasan event
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        Kepanitiaanku
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Event tempat kamu terdaftar sebagai panitia
      </p>

      {memberships.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="mt-4 font-medium text-slate-900">
              Belum terdaftar di kepanitiaan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Hubungi pengurus bila kamu seharusnya sudah terdaftar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="mt-6 w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="active">
              Kepanitiaan Aktif ({activeMemberships.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Arsip Kepanitiaan ({archivedMemberships.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderMembershipList(activeMemberships)}
          </TabsContent>
          <TabsContent value="archived">
            {renderMembershipList(archivedMemberships)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
