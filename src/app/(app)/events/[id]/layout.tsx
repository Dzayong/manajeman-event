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
    <div className="flex flex-1 flex-col lg:flex-row">
      <EventSidebar eventId={eventId} />
      <div className="min-w-0 flex-1 px-4 py-6 lg:px-8 print:p-0">
        {children}
      </div>
    </div>
  );
}
