import { differenceInMinutes, parseISO } from "date-fns";
import type { FixtureStatus, Match, Player, Team, TournamentEvent } from "../types";

export type ConflictSeverity = "info" | "warning" | "error";

export interface ScheduleConflict {
  type:
    | "court"
    | "team"
    | "player"
    | "rest"
    | "slots"
    | "phase"
    | "fixture_preliminary"
    | "fixture_published"
    | "fixture_locked";
  severity: ConflictSeverity;
  message: string;
  affectedMatchIds: string[];
  affectedTeamIds: string[];
  affectedPlayerIds: string[];
  suggestion: string;
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
        conflicts.push(createConflict({
          type: "court",
          severity: "error",
          message: `Cancha ocupada: ${current.court} tiene dos partidos a la misma hora.`,
          affectedMatchIds: [current.id, other.id],
          suggestion: "Mueve uno de los partidos a otra cancha u horario."
        }));
      }

      const repeatedTeamIds = knownTeamIds(current).filter((teamId) => knownTeamIds(other).includes(teamId));
      if (sameTime && repeatedTeamIds.length > 0) {
        conflicts.push(createConflict({
          type: "team",
          severity: "error",
          message: "Un equipo aparece en dos partidos simultaneos.",
          affectedMatchIds: [current.id, other.id],
          affectedTeamIds: repeatedTeamIds,
          suggestion: "Reprograma uno de los partidos del equipo afectado."
        }));
      }

      const repeatedPlayers = findRepeatedPlayers(current, other, teams, players);
      if (sameTime && repeatedPlayers.length > 0) {
        conflicts.push(createConflict({
          type: "player",
          severity: "warning",
          message: `${repeatedPlayers.length} jugador(es) repetidos tienen cruce de horario.`,
          affectedMatchIds: [current.id, other.id],
          affectedPlayerIds: repeatedPlayers.map((player) => player.id),
          affectedTeamIds: unique([
            ...knownTeamIds(current),
            ...knownTeamIds(other)
          ]),
          suggestion: "Revisa planteles duplicados o separa esos partidos."
        }));
      }
    }

    if (event) {
      conflicts.push(...restConflicts(current, matches, event));
    }
  }

  for (const event of events) {
    const status = event.fixtureStatus ?? "draft_auto";
    const eventMatches = matches.filter((match) => match.eventId === event.id);
    if (status === "draft_auto") {
      conflicts.push(createConflict({
        type: "fixture_preliminary",
        severity: "info",
        message: "Fixture preliminar: puede cambiar hasta cierre de inscripciones.",
        affectedMatchIds: eventMatches.map((match) => match.id),
        suggestion: "Publica el fixture solo despues de revisarlo al cerrar inscripciones."
      }));
    }
    if (status === "published") {
      conflicts.push(createConflict({
        type: "fixture_published",
        severity: "info",
        message: "Fixture publicado: la vista publica usa los equipos activos mas recientes.",
        affectedMatchIds: eventMatches.map((match) => match.id),
        suggestion: "Bloquea el fixture solo cuando la organizacion ya no acepte cambios de equipos."
      }));
    }
    if (status === "locked") {
      conflicts.push(createConflict({
        type: "fixture_locked",
        severity: "info",
        message: "Fixture bloqueado: no debe modificarse automaticamente.",
        affectedMatchIds: eventMatches.map((match) => match.id),
        suggestion: "Desbloquea solo si la organizacion decide reprogramar."
      }));
    }
  }

  return conflicts;
}

export function shouldAutoRegenerateFixture(status: FixtureStatus) {
  return status !== "locked";
}

export function canRegenerateFixtureManually(status: FixtureStatus) {
  return status === "draft_auto" || status === "draft_review" || status === "published";
}

export function canPublishFixture(status: FixtureStatus) {
  return status === "draft_review" || status === "draft_auto";
}

export function conflictsForMatch(conflicts: ScheduleConflict[], matchId: string) {
  return conflicts.filter((conflict) => conflict.affectedMatchIds.includes(matchId) || conflict.matchId === matchId);
}

function restConflicts(current: Match, matches: Match[], event: TournamentEvent): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const currentStart = parseISO(current.scheduledAt);
  const currentTeams = knownTeamIds(current);

  if (currentTeams.length === 0) return conflicts;

  const teamMatches = matches.filter(
    (match) =>
      match.id !== current.id &&
      match.scheduledAt &&
      match.status !== "postponed" &&
      knownTeamIds(match).some((teamId) => currentTeams.includes(teamId))
  );

  for (const match of teamMatches) {
    const diff = Math.abs(differenceInMinutes(currentStart, parseISO(match.scheduledAt)));
    if (diff > 0 && diff < event.minimumRestMinutes) {
      conflicts.push(createConflict({
        type: "rest",
        severity: "warning",
        message: `Descanso menor a ${event.minimumRestMinutes} minutos.`,
        affectedMatchIds: [current.id, match.id],
        affectedTeamIds: knownTeamIds(match).filter((teamId) => currentTeams.includes(teamId)),
        suggestion: "Aumenta el descanso minimo o separa rondas antes de publicar."
      }));
    }
  }

  return conflicts;
}

function findRepeatedPlayers(
  firstMatch: Match,
  secondMatch: Match,
  teams: Team[],
  players: Player[]
) {
  const firstTeamIds = knownTeamIds(firstMatch);
  const secondTeamIds = knownTeamIds(secondMatch);
  const firstTeams = teams.filter((team) => firstTeamIds.includes(team.id));
  const secondTeams = teams.filter((team) => secondTeamIds.includes(team.id));
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

function knownTeamIds(match: Match) {
  return [match.homeTeamId, match.awayTeamId].filter((teamId) => teamId && !teamId.startsWith("placeholder:"));
}

function createConflict({
  type,
  severity,
  message,
  affectedMatchIds = [],
  affectedTeamIds = [],
  affectedPlayerIds = [],
  suggestion
}: Omit<ScheduleConflict, "affectedMatchIds" | "affectedTeamIds" | "affectedPlayerIds"> & {
  affectedMatchIds?: string[];
  affectedTeamIds?: string[];
  affectedPlayerIds?: string[];
}): ScheduleConflict {
  return {
    type,
    severity,
    message,
    affectedMatchIds,
    affectedTeamIds,
    affectedPlayerIds,
    suggestion,
    matchId: affectedMatchIds[0]
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
