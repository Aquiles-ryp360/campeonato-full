import { Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { getChampionshipPublicContext, getFixtureContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export default async function ChampionshipFixturePage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const { championshipSlug } = await params;
  // Solo equipos inscritos, arbitros y admin.
  await requireServerRole("member", `/c/${championshipSlug}/fixture`);
  const data = await getPublicCompetitionData();
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button href={`/imprimir/${championshipSlug}`} variant="secondary">
          <Printer className="h-4 w-4" />
          Version imprimible
        </Button>
      </div>
      <DaySchedule
        events={fixture.events}
        teams={activeTeams}
        players={fixture.players}
        matches={visibleMatches}
        venues={fixture.venues}
        initialEventId={selected.event?.id}
      />
    </div>
  );
}
