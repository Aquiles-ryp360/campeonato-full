import type { Match, Player, Team, TournamentEvent } from "@/lib/types";
import { detectScheduleConflicts } from "@/lib/domain/conflict-detector";
import { isRegistrationOpen, rosterLimitState } from "@/lib/domain/registration-rules";
import { Badge, Card } from "@/components/ui";

export function DelegateAlerts({
  event,
  team,
  players,
  matches,
  allTeams,
  allPlayers,
  allEvents
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
  matches: Match[];
  allTeams: Team[];
  allPlayers: Player[];
  allEvents: TournamentEvent[];
}) {
  const rosterState = rosterLimitState({ event, playerCount: players.length });
  const conflicts = detectScheduleConflicts({
    matches,
    teams: allTeams,
    players: allPlayers,
    events: allEvents
  }).filter((conflict) =>
    matches.some((match) => match.id === conflict.matchId)
  );
  const alerts = [
    rosterState === "below_minimum"
      ? `Faltan jugadores: minimo requerido ${event.minPlayers}.`
      : null,
    rosterState === "above_maximum"
      ? `Plantel excede el maximo de ${event.maxPlayers} jugadores.`
      : null,
    !isRegistrationOpen(event)
      ? "Inscripciones cerradas: el plantel queda en solo lectura."
      : null,
    team.status === "observed" ? "Inscripcion observada por administracion." : null,
    ...conflicts.map((conflict) => conflict.message)
  ].filter((alert): alert is string => Boolean(alert));

  if (alerts.length === 0) {
    return (
      <Card className="p-4">
        <Badge tone="green">Sin alertas importantes</Badge>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert} className="rounded-md border border-brand-yellow/70 bg-brand-yellow/25 p-3 text-sm font-bold text-brand-navy">
            {alert}
          </div>
        ))}
      </div>
    </Card>
  );
}
