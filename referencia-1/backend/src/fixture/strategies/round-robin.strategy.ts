export interface RoundRobinMatch {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

export function generateRoundRobin(
  teamIds: string[],
  returnLeg: boolean = false,
): RoundRobinMatch[] {
  const matches: RoundRobinMatch[] = [];
  const teams = [...teamIds];

  if (teams.length < 2) return matches;

  if (teams.length % 2 !== 0) {
    teams.push(null);
  }

  const numRounds = teams.length - 1;
  const half = teams.length / 2;

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: RoundRobinMatch[] = [];
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home !== null && away !== null) {
        roundMatches.push({
          round: round + 1,
          homeTeamId: round % 2 === 0 ? home : away,
          awayTeamId: round % 2 === 0 ? away : home,
        });
      }
    }
    matches.push(...roundMatches);
    teams.splice(1, 0, teams.pop());
  }

  if (returnLeg) {
    const secondLeg = matches.map((m) => ({
      round: m.round + numRounds,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
    }));
    matches.push(...secondLeg);
  }

  return matches;
}
