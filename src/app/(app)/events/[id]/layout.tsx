import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/event-sidebar";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) notFound();

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
      <EventSidebar eventId={eventId} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
