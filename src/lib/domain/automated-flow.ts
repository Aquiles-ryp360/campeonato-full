import type { Match, MatchEvent, Player, Team, TournamentEvent, VolleyballSet } from "../types";
import { buildTeamApprovalReviews } from "./team-review";

export function teamsEligibleForSchedule(teams: Team[], { allowPaymentOverride = false } = {}) {
  return teams.filter(
    (team) => team.status === "approved" && (allowPaymentOverride || team.paymentStatus === "approved")
  );
}

export function assertCanGenerateSchedule({
  assignedVenueCount,
  activeSlotCount,
  existingMatches,
  overrideValidatedResults = false
}: {
  assignedVenueCount: number;
  activeSlotCount: number;
  existingMatches: Match[];
  overrideValidatedResults?: boolean;
}) {
  if (assignedVenueCount === 0) {
    return "Debes asignar canchas al campeonato antes de generar la programacion.";
  }

  if (activeSlotCount === 0) {
    return "Debes configurar horarios disponibles antes de generar la programacion.";
  }

  if (!overrideValidatedResults && existingMatches.some((match) => isOfficialMatchStatus(match.status))) {
    return "No se puede regenerar la programacion porque ya existen resultados validados.";
  }

  return null;
}

export function canApproveTeamAfterPayment({
  event,
  teams,
  players,
  team
}: {
  event: TournamentEvent;
  teams: Team[];
  players: Player[];
  team: Team;
}) {
  if (team.paymentStatus !== "approved") {
    return { ok: false, reason: "El pago debe estar aprobado antes de aprobar el equipo." };
  }

  const review = buildTeamApprovalReviews({ events: [event], teams, players }).get(team.id);
  if (!review || review.issues.length > 0) {
    return { ok: false, reason: review?.issues[0] ?? "El equipo no cumple las reglas deportivas." };
  }

  return { ok: true, reason: null };
}

export function nextResultStatus(event: TournamentEvent) {
  return event.autoValidateRefereeResults ? "validated" : "submitted";
}

export function isOfficialMatchStatus(status: Match["status"]) {
  return status === "validated" || status === "finished";
}

export function footballStats({
  teams,
  matches,
  events
}: {
  teams: Team[];
  matches: Match[];
  events: MatchEvent[];
}) {
  const goals = events.filter((event) => event.eventType === "goal" || event.eventType === "penalty_goal");
  const yellowCards = events.filter((event) => event.eventType === "yellow_card");
  const redCards = events.filter((event) => event.eventType === "red_card");

  return {
    standingsMatches: matches.filter((match) => isOfficialMatchStatus(match.status)),
    scorers: countByPlayer(goals),
    yellowCards: countByPlayer(yellowCards),
    redCards: countByPlayer(redCards),
    teamCount: teams.length
  };
}

export function volleyballStats({
  matches,
  sets
}: {
  matches: Match[];
  sets: VolleyballSet[];
}) {
  const officialMatchIds = new Set(matches.filter((match) => isOfficialMatchStatus(match.status)).map((match) => match.id));
  const officialSets = sets.filter((set) => officialMatchIds.has(set.matchId));

  return {
    officialMatches: officialMatchIds.size,
    sets: officialSets,
    totalPoints: officialSets.reduce((total, set) => total + set.homePoints + set.awayPoints, 0)
  };
}

function countByPlayer(events: MatchEvent[]) {
  const rows = new Map<string, number>();
  for (const event of events) {
    if (!event.playerId) continue;
    rows.set(event.playerId, (rows.get(event.playerId) ?? 0) + 1);
  }
  return Array.from(rows.entries())
    .map(([playerId, count]) => ({ playerId, count }))
    .sort((a, b) => b.count - a.count || a.playerId.localeCompare(b.playerId));
}
