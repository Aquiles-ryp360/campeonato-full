import type { Match, StandingRow, Team, TournamentEvent } from "../types";
import { calculateStandings } from "../utils";

export function buildStandings(
  event: TournamentEvent,
  teams: Team[],
  matches: Match[]
): StandingRow[] {
  return calculateStandings(event, teams, matches);
}

export function standingsByGroup({
  groupStandings,
  teamIds
}: {
  groupStandings: Array<{
    teamId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }>;
  teamIds: string[];
}) {
  const teamSet = new Set(teamIds);

  return groupStandings
    .filter((row) => teamSet.has(row.teamId))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
    );
}
