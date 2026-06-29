import { CalendarDays, CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import type { Match, Player, Team, TournamentEvent } from "@/lib/types";
import { Metric } from "@/components/ui";
import { formatDateTime, teamStatusLabel } from "@/lib/utils";

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
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Estado" value={teamStatusLabel(team.status)} icon={ShieldCheck} />
      <Metric label="Pago" value={team.paymentStatus === "verified" ? "Validado" : "En revision"} icon={CreditCard} tone="amber" />
      <Metric label="Jugadores" value={`${players.length}/${event.maxPlayers}`} icon={UsersRound} tone="blue" />
      <Metric
        label="Proximo partido"
        value={nextMatch ? formatDateTime(nextMatch.scheduledAt) : "Sin programar"}
        icon={CalendarDays}
        tone="green"
      />
    </section>
  );
}
