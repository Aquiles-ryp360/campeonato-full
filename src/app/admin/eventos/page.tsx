import { EventBuilder } from "@/components/event-builder";
import { AdminShell } from "@/components/shell";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const data = await getPublicCompetitionData();

  return (
    <AdminShell>
      <EventBuilder initialEvents={data.events} />
    </AdminShell>
  );
}
