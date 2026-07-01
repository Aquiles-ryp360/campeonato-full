import type { Match, MatchLiveEvent, MatchLiveEventType } from "./types";

export const liveMatchStatuses = [
  "in_progress_first_half",
  "halftime",
  "in_progress_second_half",
  "pending_tiebreak",
  "penalties"
] as const;

export const reviewLiveStatuses = ["submitted", "under_review"] as const;

export type PenaltyShootoutSide = "home" | "away";

export type PenaltyShootoutAttempt = {
  id: string;
  teamId?: string;
  playerId?: string;
  jerseyNumber?: number;
  order: number;
  scored: boolean;
  createdAt: string;
};

export type PenaltyShootoutSummary = {
  home: PenaltyShootoutAttempt[];
  away: PenaltyShootoutAttempt[];
  homeAttempts: number;
  awayAttempts: number;
  homeScore: number;
  awayScore: number;
  nextSide: PenaltyShootoutSide;
  nextTeamId?: string;
  winnerTeamId?: string;
};

export function isPenaltyShootoutEvent(eventType: MatchLiveEventType | string) {
  return eventType === "penalty_scored" || eventType === "penalty_missed_tiebreak";
}

export function isPublicLiveMatch(match: Match) {
  const status = match.liveStatus ?? "scheduled";
  return (
    liveMatchStatuses.includes(status as (typeof liveMatchStatuses)[number]) ||
    reviewLiveStatuses.includes(status as (typeof reviewLiveStatuses)[number])
  );
}

export function splitPublicLiveMatches(matches: Match[]) {
  const liveMatches = matches
    .filter(isPublicLiveMatch)
    .sort((a, b) => {
      const statusA = liveMatchStatuses.includes((a.liveStatus ?? "scheduled") as (typeof liveMatchStatuses)[number]) ? 0 : 1;
      const statusB = liveMatchStatuses.includes((b.liveStatus ?? "scheduled") as (typeof liveMatchStatuses)[number]) ? 0 : 1;
      return statusA - statusB || a.scheduledAt.localeCompare(b.scheduledAt);
    });

  return {
    primary: liveMatches[0],
    secondary: liveMatches.slice(1),
    all: liveMatches
  };
}

export function summarizePenaltyShootout(
  match: Pick<Match, "homeTeamId" | "awayTeamId" | "penaltyHomeScore" | "penaltyAwayScore">,
  events: MatchLiveEvent[]
): PenaltyShootoutSummary {
  const activeAttempts = events
    .filter((event) => isPenaltyShootoutEvent(event.eventType) && !event.correctedAt)
    .sort(comparePenaltyAttempts)
    .map((event, index) => ({
      id: event.id,
      teamId: event.teamId,
      playerId: event.playerId,
      jerseyNumber: event.jerseyNumber,
      order: event.penaltyOrder ?? index + 1,
      scored: event.eventType === "penalty_scored",
      createdAt: event.createdAt
    }));

  const home = activeAttempts.filter((attempt) => attempt.teamId === match.homeTeamId);
  const away = activeAttempts.filter((attempt) => attempt.teamId === match.awayTeamId);
  const homeScore = home.filter((attempt) => attempt.scored).length;
  const awayScore = away.filter((attempt) => attempt.scored).length;
  const nextSide: PenaltyShootoutSide = home.length <= away.length ? "home" : "away";
  const winnerTeamId =
    homeScore === awayScore
      ? undefined
      : homeScore > awayScore
        ? match.homeTeamId
        : match.awayTeamId;

  return {
    home,
    away,
    homeAttempts: home.length,
    awayAttempts: away.length,
    homeScore,
    awayScore,
    nextSide,
    nextTeamId: nextSide === "home" ? match.homeTeamId : match.awayTeamId,
    winnerTeamId
  };
}

export function formatMatchScore(match: Match) {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const penaltyHome = match.penaltyHomeScore ?? 0;
  const penaltyAway = match.penaltyAwayScore ?? 0;
  const showPenalties = (match.liveStatus === "penalties" || penaltyHome > 0 || penaltyAway > 0);

  if (!showPenalties) return `${homeScore} - ${awayScore}`;
  return `${homeScore} (${penaltyHome}) - ${awayScore} (${penaltyAway})`;
}

export function liveStatusLabel(status?: Match["liveStatus"], fallbackStatus?: Match["status"]) {
  const labels: Record<string, string> = {
    scheduled: "Programado",
    in_progress_first_half: "Primer tiempo",
    halftime: "Descanso",
    in_progress_second_half: "Segundo tiempo",
    pending_tiebreak: "Definir desempate",
    penalties: "Penales",
    submitted: "En evaluacion",
    validated: "Validado",
    under_review: "En evaluacion",
    disputed: "Observado",
    cancelled: "Cancelado"
  };

  if (status && status !== "scheduled") return labels[status] ?? "Programado";
  if (fallbackStatus === "finished") return "Finalizado";
  if (fallbackStatus === "walkover") return "W.O.";
  if (fallbackStatus === "postponed") return "Pospuesto";
  return "Programado";
}

export function liveStatusDescription(match: Match) {
  const status = match.liveStatus ?? "scheduled";
  if (status === "in_progress_first_half") return "Primer tiempo";
  if (status === "halftime") return "Descanso";
  if (status === "in_progress_second_half") return "Segundo tiempo";
  if (status === "pending_tiebreak") return "Debe definir ganador";
  if (status === "penalties") return "Penales en curso";
  if (status === "submitted" || status === "under_review") return "En evaluacion";
  if (status === "validated") return "Validado";
  return liveStatusLabel(status, match.status);
}

export function visiblePenaltyScores(match: Match) {
  return {
    home: match.penaltyHomeScore ?? 0,
    away: match.penaltyAwayScore ?? 0,
    hasPenalties:
      match.liveStatus === "penalties" ||
      (match.penaltyHomeScore ?? 0) > 0 ||
      (match.penaltyAwayScore ?? 0) > 0
  };
}

function comparePenaltyAttempts(a: MatchLiveEvent, b: MatchLiveEvent) {
  const orderA = a.penaltyOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.penaltyOrder ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.createdAt.localeCompare(b.createdAt);
}
