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

    return (
      <div>
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
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
        )}
      </div>
    );
  }

  const memberships = await db.membership.findMany({
    where: { userId: session.userId },
    include: { event: true, division: true },
    orderBy: { event: { createdAt: "desc" } },
  });

  return (
    <div>
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {memberships.map((m) => (
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
              <CardContent className="text-sm text-slate-500">
                Workspace divisi hadir di milestone berikutnya (M2).
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
