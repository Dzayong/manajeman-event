import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, LayoutDashboard, MapPin, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requirePengurus } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventActions } from "./event-actions";
import { DivisionsPanel } from "./divisions-panel";
import { MembersPanel } from "./members-panel";
import { RulesPanel } from "./rules-panel";

export const metadata = { title: "Detail event — Sistem Kepanitiaan HMIF" };

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toInputDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EventDetailPage({
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
    include: {
      divisions: {
        include: { _count: { select: { memberships: true, tasks: true } } },
        orderBy: { id: "asc" },
      },
      memberships: {
        include: {
          user: { select: { id: true, name: true, username: true, email: true } },
          division: { select: { id: true, name: true } },
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      },
      _count: { select: { ruleAcks: true } },
    },
  });
  if (!event) notFound();

  const ackCount = await db.ruleAcknowledgment.count({
    where: { eventId, rulesVersion: event.rulesVersion },
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {event.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatDate(event.startDate)}
              {event.endDate ? ` – ${formatDate(event.endDate)}` : ""}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {event.description}
            </p>
          )}
        </div>
        <EventActions
          event={{
            id: event.id,
            name: event.name,
            description: event.description ?? "",
            location: event.location ?? "",
            startDate: toInputDate(event.startDate),
            endDate: toInputDate(event.endDate),
            status: event.status,
          }}
        />
      </div>

      <Tabs defaultValue="divisions" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="divisions">
              Divisi ({event.divisions.length})
            </TabsTrigger>
            <TabsTrigger value="members">
              Panitia ({event.memberships.length})
            </TabsTrigger>
            <TabsTrigger value="rules">Aturan</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/events/${event.id}/workspace`}>
                <LayoutDashboard className="mr-1 h-4 w-4" />
                Workspace
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/events/${event.id}/import`}>
                <Upload className="mr-1 h-4 w-4" />
                Import panitia
              </Link>
            </Button>
          </div>
        </div>

        <TabsContent value="divisions" className="mt-4">
          <DivisionsPanel
            eventId={event.id}
            divisions={event.divisions.map((d) => ({
              id: d.id,
              name: d.name,
              description: d.description,
              memberCount: d._count.memberships,
              taskCount: d._count.tasks,
            }))}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersPanel
            eventId={event.id}
            members={event.memberships.map((m) => ({
              membershipId: m.id,
              name: m.user.name,
              username: m.user.username,
              email: m.user.email,
              position: m.position,
              divisionName: m.division?.name ?? null,
            }))}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RulesPanel
            eventId={event.id}
            rulesContent={event.rulesContent ?? ""}
            rulesVersion={event.rulesVersion}
            ackCount={ackCount}
            memberCount={event.memberships.length}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
