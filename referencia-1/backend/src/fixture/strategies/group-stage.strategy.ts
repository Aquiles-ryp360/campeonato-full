import { generateRoundRobin, RoundRobinMatch } from './round-robin.strategy';

export interface GroupStageMatch {
  group: number;
  groupName: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

export function generateGroupStage(
  teamIds: string[],
  groupsCount: number = 4,
): GroupStageMatch[] {
  const matches: GroupStageMatch[] = [];

  if (teamIds.length < 2) return matches;
  if (groupsCount < 2) groupsCount = 2;

  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const groups: string[][] = [];
  const teamsPerGroup = Math.ceil(shuffled.length / groupsCount);

  for (let g = 0; g < groupsCount; g++) {
    const start = g * teamsPerGroup;
    const end = start + teamsPerGroup;
    groups.push(shuffled.slice(start, end));
  }

  const groupLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let g = 0; g < groups.length; g++) {
    const groupTeams = groups[g].filter((t) => t);
    if (groupTeams.length < 2) continue;

    const groupMatches = generateRoundRobin(groupTeams, false);
    const groupName = groupLabels[g] || `Group ${g + 1}`;

    for (const gm of groupMatches) {
      matches.push({
        group: g + 1,
        groupName,
        round: gm.round,
        homeTeamId: gm.homeTeamId,
        awayTeamId: gm.awayTeamId,
      });
    }
  }

  return matches;
}
