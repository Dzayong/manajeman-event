import { db } from "@/lib/db";
import { requireSession } from "@/lib/authz";
import { getEventAccess, canViewDivision, canManageFinance } from "@/lib/permissions";
import { EventSidebarNav } from "@/components/event-sidebar-nav";

/**
 * Persistent per-event navigation, shown on every page under an event
 * (workspace, finance, settings, and each division workspace) so users
 * always have a map of where they can go instead of relying on a single
 * "back" link per page.
 */
export async function EventSidebar({ eventId }: { eventId: number }) {
  const session = await requireSession();
  const access = await getEventAccess(session, eventId);
  if (!access) return null;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      name: true,
      divisions: { select: { id: true, name: true }, orderBy: { id: "asc" } },
    },
  });
  if (!event) return null;

  const divisions = event.divisions.filter((d) => canViewDivision(access, d.id));

  return (
    <EventSidebarNav
      eventId={eventId}
      eventName={event.name}
      divisions={divisions}
      canManageEvent={access.canManageEvent}
      canManageFinance={canManageFinance(access)}
    />
  );
}
