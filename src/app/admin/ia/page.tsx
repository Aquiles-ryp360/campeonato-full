import { AudioReview } from "@/components/audio-review";
import { AdminShell } from "@/components/shell";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AudioAiPage() {
  const data = await getPublicCompetitionData();

  return (
    <AdminShell>
      <AudioReview events={data.events} />
    </AdminShell>
  );
}
