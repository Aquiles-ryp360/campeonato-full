import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { getChampionshipPublicContext, getFixtureContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipFixturePage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const [{ championshipSlug }, data] = await Promise.all([params, getPublicCompetitionData()]);
  const selected = getChampionshipPublicContext(data, championshipSlug);
  const fixture = getFixtureContext(data);
  const visibleMatches = buildVisibleFixtureMatches({
    events: fixture.events,
    teams: fixture.teams,
    matches: fixture.matches,
    venues: fixture.venues
  });

  return (
    <DaySchedule
      events={fixture.events}
      teams={fixture.teams}
      players={fixture.players}
      matches={visibleMatches}
      venues={fixture.venues}
      initialEventId={selected.event?.id}
    />
  );
}
