import { CalendarDays, Clock, Trophy, UsersRound } from "lucide-react";
import type { Match, Team, TournamentEvent } from "@/lib/types";
import { Metric } from "@/components/ui";
import { fixtureStatusLabel, formatDateTime } from "@/lib/utils";
import { tournamentFormatLabel } from "@/lib/domain/tournament-format";

export function ChampionshipSummaryCards({
  event,
  teams,
  matches
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
}) {
  const nextMatch = matches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Equipos inscritos" value={`${teams.length}/${event.maxTeams}`} icon={UsersRound} />
      <Metric label="Formato" value={tournamentFormatLabel(event.format)} icon={Trophy} tone="blue" />
      <Metric
        label="Fecha base"
        value={nextMatch ? formatDateTime(nextMatch.scheduledAt) : "Por definir"}
        icon={CalendarDays}
        tone="amber"
      />
      <Metric
        label="Fixture"
        value={fixtureStatusLabel(event.fixtureStatus)}
        icon={Clock}
        tone="green"
      />
    </section>
  );
}
