import { RegistrationForm } from "@/components/registration-form";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipRegistrationPage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const [{ championshipSlug }, data] = await Promise.all([params, getPublicCompetitionData()]);
  const context = getChampionshipPublicContext(data, championshipSlug);
  const teamCountsByEventId = data.teams.reduce<Record<string, number>>((counts, team) => {
    if (!isActiveRegistrationTeamStatus(team.status)) return counts;
    counts[team.eventId] = (counts[team.eventId] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <RegistrationForm
      events={data.events}
      initialEventId={context.event?.id}
      teamCountsByEventId={teamCountsByEventId}
    />
  );
}
