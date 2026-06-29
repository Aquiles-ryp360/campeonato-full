import { PublicHome } from "@/features/public/components/PublicHome";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipPage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const [{ championshipSlug }, data] = await Promise.all([params, getPublicCompetitionData()]);
  return <PublicHome data={data} initialChampionship={championshipSlug} />;
}
