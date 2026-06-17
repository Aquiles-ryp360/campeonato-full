export interface DoubleEliminationMatch {
  round: number;
  matchNumber: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  bracket: 'winners' | 'losers';
}

export function generateDoubleElimination(
  teamIds: string[],
): DoubleEliminationMatch[] {
  const matches: DoubleEliminationMatch[] = [];
  const teams = [...teamIds];

  if (teams.length < 2) return matches;

  const totalRounds = Math.ceil(Math.log2(teams.length));
  const totalSlots = Math.pow(2, totalRounds);

  const orderedTeams: (string | null)[] = new Array(totalSlots).fill(null);
  const seeded = seedDoubleElim(teams, totalSlots);
  for (let i = 0; i < seeded.length; i++) {
    orderedTeams[i] = seeded[i];
  }

  let matchNumber = 0;

  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round - 1);
    for (let m = 0; m < matchesInRound; m++) {
      matchNumber++;
      const idx = m * 2;
      matches.push({
        round: round + 1,
        matchNumber,
        homeTeamId: orderedTeams[idx] || null,
        awayTeamId: orderedTeams[idx + 1] || null,
        bracket: 'winners',
      });
    }
  }

  const losersRounds = totalRounds * 2 - 1;
  for (let round = 0; round < losersRounds; round++) {
    const matchesInRound = Math.max(
      1,
      Math.floor(Math.pow(2, totalRounds - 1 - Math.floor(round / 2))),
    );
    for (let m = 0; m < matchesInRound; m++) {
      matchNumber++;
      matches.push({
        round: round + 1,
        matchNumber,
        homeTeamId: null,
        awayTeamId: null,
        bracket: 'losers',
      });
    }
  }

  matchNumber++;
  matches.push({
    round: totalRounds + Math.ceil(losersRounds / 2),
    matchNumber,
    homeTeamId: null,
    awayTeamId: null,
    bracket: 'winners',
  });

  return matches;
}

function seedDoubleElim(
  teams: string[],
  totalSlots: number,
): (string | null)[] {
  const seeded: (string | null)[] = new Array(totalSlots).fill(null);
  const n = teams.length;
  for (let i = 0; i < n && i < totalSlots; i++) {
    seeded[i] = teams[i];
  }
  return seeded;
}
