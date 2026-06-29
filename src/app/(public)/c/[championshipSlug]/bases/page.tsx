import { PublicBasesPage } from "@/features/bases/components/PublicBasesPage";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipBasesPage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const [{ championshipSlug }, data] = await Promise.all([params, getPublicCompetitionData()]);
  return <PublicBasesPage data={data} initialChampionship={championshipSlug} />;
}
