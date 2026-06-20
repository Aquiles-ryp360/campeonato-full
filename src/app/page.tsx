import { PublicShell } from "@/components/shell";
import { PublicDashboard } from "@/components/public-dashboard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicCompetitionData();

  return (
    <PublicShell>
      <PublicDashboard data={data} />
    </PublicShell>
  );
}
