import { CalendarDays, CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import type { Match, Player, Team, TournamentEvent } from "@/lib/types";
import { Metric } from "@/components/ui";
import { teamStatusLabel } from "@/lib/utils";
import { matchScheduleLabel } from "@/lib/match-time";

export function DelegateSummaryCards({
  event,
  team,
  players,
  matches
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
  matches: Match[];
}) {
  const nextMatch = matches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Metric label="Estado" value={teamStatusLabel(team.status)} icon={ShieldCheck} />
      <Metric label="Pago" value={team.paymentStatus === "verified" ? "Validado" : "En revision"} icon={CreditCard} tone="amber" />
      <Metric label="Jugadores" value={`${players.length}/${event.maxPlayers}`} icon={UsersRound} tone="blue" />
      <Metric
        label="Próximo partido"
        value={nextMatch ? matchScheduleLabel(nextMatch) : "Sin programar"}
        icon={CalendarDays}
        tone="green"
      />
    </section>
  );
}
