import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess } from "@/lib/permissions";
import { LetterClient } from "./letter-client";

export const metadata = { title: "Cetak Surat — Sistem Kepanitiaan HMIF" };

export default async function LetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) notFound();

  const access = await getEventAccess(session, eventId);
  if (!access) redirect("/dashboard");

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      name: true,
      location: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!event) notFound();

  const proposal = await db.proposal.findUnique({
    where: { eventId },
    select: {
      status: true,
      tema: true,
      reviewNote: true,
    },
  });

  const isApproved = proposal?.status === "APPROVED";

  const members = await db.membership.findMany({
    where: { eventId },
    include: {
      user: { select: { name: true } },
      division: { select: { name: true } },
    },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  const mappedMembers = members.map((m) => ({
    name: m.user.name,
    position: m.position,
    divisionName: m.division?.name ?? null,
  }));

  return (
    <LetterClient
      eventId={eventId}
      eventName={event.name}
      eventLocation={event.location}
      eventStartDate={event.startDate ? event.startDate.toISOString() : null}
      eventEndDate={event.endDate ? event.endDate.toISOString() : null}
      proposalTema={proposal?.tema ?? null}
      members={mappedMembers}
      isApproved={isApproved}
    />
  );
}
