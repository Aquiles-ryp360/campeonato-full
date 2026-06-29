import type { Team, TournamentEvent } from "../types";

export function isRegistrationOpen(event: TournamentEvent, now = new Date()) {
  return (
    event.status === "registration" &&
    new Date(event.registrationOpenUntil).getTime() >= now.getTime()
  );
}

export function rosterLimitState({
  event,
  playerCount
}: {
  event: TournamentEvent;
  playerCount: number;
}) {
  if (playerCount < event.minPlayers) return "below_minimum";
  if (playerCount > event.maxPlayers) return "above_maximum";
  return "ok";
}

export function shouldReturnToReview(team: Team, changedImportantData: boolean) {
  return team.status === "approved" && changedImportantData;
}
