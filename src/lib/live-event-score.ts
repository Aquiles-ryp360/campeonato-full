export type LiveScoreMatchSides = {
  homeTeamId?: string | null;
  awayTeamId?: string | null;
};

export type LiveScoreEvent = {
  teamId?: string | null;
  eventType: string;
  correctedAt?: string | null;
};

export type LiveScoreSummary = {
  homeScore: number;
  awayScore: number;
  penaltyHomeScore: number;
  penaltyAwayScore: number;
};

export function scoreFromLiveEvents(
  match: LiveScoreMatchSides,
  events: LiveScoreEvent[]
): LiveScoreSummary {
  return events.reduce(
    (current, event) => {
      if (event.correctedAt || !event.teamId) return current;

      if (event.eventType === "goal" || event.eventType === "penalty_goal") {
        if (event.teamId === match.homeTeamId) current.homeScore += 1;
        if (event.teamId === match.awayTeamId) current.awayScore += 1;
      }

      if (event.eventType === "own_goal") {
        if (event.teamId === match.homeTeamId) current.awayScore += 1;
        if (event.teamId === match.awayTeamId) current.homeScore += 1;
      }

      if (event.eventType === "penalty_scored") {
        if (event.teamId === match.homeTeamId) current.penaltyHomeScore += 1;
        if (event.teamId === match.awayTeamId) current.penaltyAwayScore += 1;
      }

      return current;
    },
    {
      homeScore: 0,
      awayScore: 0,
      penaltyHomeScore: 0,
      penaltyAwayScore: 0
    }
  );
}
