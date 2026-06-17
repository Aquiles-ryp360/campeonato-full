export interface KnockoutMatch {
  round: number;
  matchNumber: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  bracket: string;
}

export function generateKnockoutBracket(teamIds: string[]): KnockoutMatch[] {
  const matches: KnockoutMatch[] = [];
  const teams = [...teamIds];

  if (teams.length < 2) return matches;

  const totalRounds = Math.ceil(Math.log2(teams.length));
  const totalSlots = Math.pow(2, totalRounds);
  const byes = totalSlots - teams.length;

  const orderedTeams: (string | null)[] = new Array(totalSlots).fill(null);
  const seeded = seedTeams(teams, totalSlots);
  for (let i = 0; i < seeded.length; i++) {
    orderedTeams[i] = seeded[i];
  }

  let matchNumber = 0;

  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round - 1);
    const roundNum = round + 1;

    for (let m = 0; m < matchesInRound; m++) {
      matchNumber++;
      const idx = m * 2;

      let homeTeam: string | null = null;
      let awayTeam: string | null = null;

      if (round === 0) {
        homeTeam = orderedTeams[idx] || null;
        awayTeam = orderedTeams[idx + 1] || null;
      }

      matches.push({
        round: roundNum,
        matchNumber,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        bracket: 'winner',
      });
    }
  }

  return matches;
}

function seedTeams(teams: string[], totalSlots: number): (string | null)[] {
  const seeded: (string | null)[] = new Array(totalSlots).fill(null);
  const n = teams.length;

  if (n === 0) return seeded;

  const indices: number[] = [];
  const order = [0];
  while (order.length < totalSlots) {
    const newOrder: number[] = [];
    for (const i of order) {
      newOrder.push(i);
      const complement = totalSlots - 1 - i;
      if (!newOrder.includes(complement)) {
        newOrder.push(complement);
      }
    }
    order.length = 0;
    order.push(...newOrder);
    if (order.length >= totalSlots) break;
  }

  for (let i = 0; i < n && i < totalSlots; i++) {
    seeded[order[i]] = teams[i];
  }

  return seeded;
}
