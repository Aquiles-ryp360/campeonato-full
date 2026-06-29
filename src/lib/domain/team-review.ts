import type { Player, Team, TournamentEvent } from "../types";

export type DuplicateRosterAlert = {
  kind: "DNI" | "Codigo";
  value: string;
  playerName: string;
  teamNames: string[];
};

export type TeamApprovalReview = {
  event: TournamentEvent | null;
  players: Player[];
  playerCount: number;
  issues: string[];
  duplicateAlerts: DuplicateRosterAlert[];
};

export function buildTeamApprovalReviews({
  events,
  teams,
  players
}: {
  events: TournamentEvent[];
  teams: Team[];
  players: Player[];
}) {
  const duplicateAlertsByTeamId = buildDuplicateAlertsByTeamId(teams, players);
  const reviews = new Map<string, TeamApprovalReview>();

  for (const team of teams) {
    const event = events.find((item) => item.id === team.eventId) ?? null;
    const teamPlayers = players.filter((player) => player.teamId === team.id);
    const duplicateAlerts = duplicateAlertsByTeamId.get(team.id) ?? [];
    const issues: string[] = [];

    if (!event) {
      issues.push("No se encontro el campeonato del equipo.");
    } else {
      if (teamPlayers.length < event.minPlayers) {
        issues.push(`Faltan ${event.minPlayers - teamPlayers.length} jugador(es) para el minimo.`);
      }
      if (teamPlayers.length > event.maxPlayers) {
        issues.push(`Excede el maximo por ${teamPlayers.length - event.maxPlayers} jugador(es).`);
      }
    }

    if (duplicateAlerts.length > 0) {
      issues.push("Hay jugador(es) repetidos en otro equipo del mismo campeonato.");
    }

    reviews.set(team.id, {
      event,
      players: teamPlayers,
      playerCount: teamPlayers.length,
      issues,
      duplicateAlerts
    });
  }

  return reviews;
}

export function buildDuplicateRosterAlerts(teams: Team[], players: Player[]) {
  return Array.from(buildDuplicateAlertsByTeamId(teams, players).values()).flat();
}

export function buildDuplicateAlertsByTeamId(teams: Team[], players: Player[]) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const teamIdsByEventId = new Map<string, Set<string>>();
  const alertsByTeamId = new Map<string, DuplicateRosterAlert[]>();

  for (const team of teams) {
    const teamIds = teamIdsByEventId.get(team.eventId) ?? new Set<string>();
    teamIds.add(team.id);
    teamIdsByEventId.set(team.eventId, teamIds);
  }

  for (const teamIds of teamIdsByEventId.values()) {
    const buckets = new Map<string, { kind: "DNI" | "Codigo"; value: string; players: Player[] }>();

    for (const player of players.filter((item) => teamIds.has(item.teamId))) {
      for (const key of duplicateKeys(player)) {
        const bucket = buckets.get(key.key) ?? { kind: key.kind, value: key.value, players: [] };
        bucket.players.push(player);
        buckets.set(key.key, bucket);
      }
    }

    for (const bucket of buckets.values()) {
      const affectedTeamIds = Array.from(new Set(bucket.players.map((player) => player.teamId)));
      if (affectedTeamIds.length < 2) continue;

      const teamNames = affectedTeamIds.map((teamId) => teamsById.get(teamId)?.name ?? "Equipo");
      for (const player of bucket.players) {
        const currentAlerts = alertsByTeamId.get(player.teamId) ?? [];
        currentAlerts.push({
          kind: bucket.kind,
          value: bucket.value,
          playerName: `${player.firstName} ${player.lastName}`.trim() || "Jugador",
          teamNames
        });
        alertsByTeamId.set(player.teamId, currentAlerts);
      }
    }
  }

  return alertsByTeamId;
}

export function duplicateKeys(player: Player) {
  return [
    { kind: "DNI" as const, value: player.dni, key: `dni:${normalizeKey(player.dni)}` },
    { kind: "Codigo" as const, value: player.studentCode, key: `code:${normalizeKey(player.studentCode)}` }
  ].filter((item) => !item.key.endsWith(":"));
}

export function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
