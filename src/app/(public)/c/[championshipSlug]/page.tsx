import { PublicHome } from "@/features/public/components/PublicHome";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipPage({
  params,
  searchParams
}: {
  params: Promise<{ championshipSlug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ championshipSlug }, { category }, data] = await Promise.all([
    params,
    searchParams,
    getPublicCompetitionData()
  ]);
  return (
    <PublicHome
      data={data}
      initialChampionship={championshipSlug}
      initialCategoryId={category}
    />
  );
}
