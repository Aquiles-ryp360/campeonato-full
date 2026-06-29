import { differenceInMinutes, parseISO } from "date-fns";
import type { Match, Player, Team, TournamentEvent } from "../types";

export type ConflictSeverity = "info" | "warning" | "error";

export interface ScheduleConflict {
  type:
    | "court"
    | "team"
    | "player"
    | "rest"
    | "slots"
    | "phase";
  severity: ConflictSeverity;
  message: string;
  matchId?: string;
}

export function detectScheduleConflicts({
  matches,
  teams,
  players,
  events
}: {
  matches: Match[];
  teams: Team[];
  players: Player[];
  events: TournamentEvent[];
}): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    if (!current.scheduledAt || current.status === "postponed") continue;

    const event = events.find((item) => item.id === current.eventId);
    const currentStart = parseISO(current.scheduledAt);

    for (const other of matches.slice(index + 1)) {
      if (!other.scheduledAt || other.status === "postponed") continue;
      const otherStart = parseISO(other.scheduledAt);
      const sameTime = Math.abs(differenceInMinutes(currentStart, otherStart)) < 1;

      if (sameTime && current.court === other.court) {
        conflicts.push({
          type: "court",
          severity: "error",
          matchId: current.id,
          message: `Cancha ocupada: ${current.court} tiene dos partidos a la misma hora.`
        });
      }

      if (
        sameTime &&
        [current.homeTeamId, current.awayTeamId].some((teamId) =>
          [other.homeTeamId, other.awayTeamId].includes(teamId)
        )
      ) {
        conflicts.push({
          type: "team",
          severity: "error",
          matchId: current.id,
          message: "Un equipo aparece en dos partidos simultaneos."
        });
      }

      const repeatedPlayers = findRepeatedPlayers(current, other, teams, players);
      if (sameTime && repeatedPlayers.length > 0) {
        conflicts.push({
          type: "player",
          severity: "warning",
          matchId: current.id,
          message: `${repeatedPlayers.length} jugador(es) repetidos tienen cruce de horario.`
        });
      }
    }

    if (event) {
      const teamMatches = matches.filter(
        (match) =>
          match.id !== current.id &&
          match.scheduledAt &&
          match.status !== "postponed" &&
          (match.homeTeamId === current.homeTeamId ||
            match.awayTeamId === current.homeTeamId ||
            match.homeTeamId === current.awayTeamId ||
            match.awayTeamId === current.awayTeamId)
      );

      const hasRestWarning = teamMatches.some((match) => {
        const diff = Math.abs(differenceInMinutes(currentStart, parseISO(match.scheduledAt)));
        return diff > 0 && diff < event.minimumRestMinutes;
      });

      if (hasRestWarning) {
        conflicts.push({
          type: "rest",
          severity: "warning",
          matchId: current.id,
          message: `Descanso menor a ${event.minimumRestMinutes} minutos.`
        });
      }
    }
  }

  return conflicts;
}

export function conflictsForMatch(conflicts: ScheduleConflict[], matchId: string) {
  return conflicts.filter((conflict) => conflict.matchId === matchId);
}

function findRepeatedPlayers(
  firstMatch: Match,
  secondMatch: Match,
  teams: Team[],
  players: Player[]
) {
  const firstEventTeamIds = [firstMatch.homeTeamId, firstMatch.awayTeamId];
  const secondEventTeamIds = [secondMatch.homeTeamId, secondMatch.awayTeamId];
  const firstTeams = teams.filter((team) => firstEventTeamIds.includes(team.id));
  const secondTeams = teams.filter((team) => secondEventTeamIds.includes(team.id));
  const firstCodes = new Set(
    players
      .filter((player) => firstTeams.some((team) => team.id === player.teamId))
      .map((player) => player.studentCode)
  );

  return players.filter(
    (player) =>
      secondTeams.some((team) => team.id === player.teamId) &&
      firstCodes.has(player.studentCode)
  );
}
