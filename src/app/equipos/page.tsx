import { PublicShell } from "@/components/shell";
import { PublicTeams } from "@/components/public-teams";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const data = await getPublicCompetitionData();

  return (
    <PublicShell>
      <PublicTeams data={data} />
    </PublicShell>
  );
}
