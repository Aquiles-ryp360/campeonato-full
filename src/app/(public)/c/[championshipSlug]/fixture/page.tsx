import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { getChampionshipPublicContext, getFixtureContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipFixturePage({
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
  const selected = getChampionshipPublicContext(data, championshipSlug, category);
  const fixture = getFixtureContext(data);

  return (
    <DaySchedule
      events={fixture.events}
      categories={fixture.categories}
      teams={fixture.teams}
      players={fixture.players}
      matches={fixture.matches}
      venues={fixture.venues}
      initialEventId={selected.event?.id}
      initialCategoryId={selected.selectedCategory?.id}
    />
  );
}
