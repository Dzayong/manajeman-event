import type { Position } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

export type EventAccess = {
  eventId: number;
  isPengurus: boolean;
  position: Position | null;
  divisionId: number | null;
  /** Pengurus, Ketua Pelaksana, Sekretaris — full control over the event */
  canManageEvent: boolean;
  /** SC — sees everything, changes nothing */
  readOnly: boolean;
};

export async function getEventAccess(
  session: SessionPayload,
  eventId: number,
): Promise<EventAccess | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event) return null;

  const isDone = event.status === "DONE";

  if (session.role === "PENGURUS") {
    return {
      eventId,
      isPengurus: true,
      position: null,
      divisionId: null,
      canManageEvent: !isDone,
      readOnly: isDone,
    };
  }

  const membership = await db.membership.findUnique({
    where: { userId_eventId: { userId: session.userId, eventId } },
  });
  if (!membership) return null;

  return {
    eventId,
    isPengurus: false,
    position: membership.position,
    divisionId: membership.divisionId,
    canManageEvent:
      !isDone &&
      (membership.position === "KETUA_PANITIA" ||
        membership.position === "SEKRETARIS"),
    readOnly: isDone || membership.position === "SC",
  };
}

/** Who may open a division workspace at all. */
export function canViewDivision(
  access: EventAccess,
  divisionId: number,
): boolean {
  if (access.isPengurus || access.canManageEvent || access.readOnly)
    return true;
  if (access.position === "BENDAHARA") return true;
  return access.divisionId === divisionId;
}

/** Who may create/update tasks and documents inside a division. */
export function canEditDivision(
  access: EventAccess,
  divisionId: number,
): boolean {
  if (access.readOnly) return false;
  if (access.isPengurus || access.canManageEvent) return true;
  return access.divisionId === divisionId;
}

/** Who may manage RAB and expense records. */
export function canManageFinance(access: EventAccess): boolean {
  if (access.readOnly) return false;
  return (
    access.isPengurus ||
    access.canManageEvent ||
    access.position === "BENDAHARA"
  );
}

/** Who may run attendance sessions and edit milestones. */
export function canOperateEvent(access: EventAccess): boolean {
  if (access.readOnly) return false;
  return (
    access.isPengurus ||
    access.canManageEvent ||
    access.position === "KOORDINATOR"
  );
}
