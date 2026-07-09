import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
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
  const fixture = selected.event
    ? {
        events: [selected.event],
        teams: selected.teams,
        players: selected.players,
        matches: selected.matches,
        venues: selected.venues
      }
    : getFixtureContext(data);
  const activeTeams = fixture.teams.filter((team) => isActiveRegistrationTeamStatus(team.status));
  const visibleMatches = buildVisibleFixtureMatches({
    events: fixture.events,
    teams: activeTeams,
    matches: fixture.matches,
    venues: fixture.venues
  });

  return (
    <DaySchedule
      events={fixture.events}
      teams={activeTeams}
      players={fixture.players}
      matches={visibleMatches}
      venues={fixture.venues}
      initialEventId={selected.event?.id}
    />
  );
}
