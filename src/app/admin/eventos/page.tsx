import { EventBuilder } from "@/components/event-builder";
import { AdminShell } from "@/components/shell";

export default function EventsPage() {
  return (
    <AdminShell>
      <EventBuilder />
    </AdminShell>
  );
}
