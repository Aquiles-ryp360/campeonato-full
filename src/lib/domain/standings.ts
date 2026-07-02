import type { Group, GroupStanding, GroupTeam, Match, StandingRow, Team, TournamentEvent } from "../types";
import { calculateStandings } from "../utils";

export type QualificationType = "direct" | "best_third";

export type GroupStandingDisplayRow = GroupStanding & {
  teamName: string;
  rankInGroup: number;
  qualificationType?: QualificationType;
  qualificationSeed?: number;
  source: "computed" | "stored" | "empty";
};

export type BestThirdCandidate = GroupStandingDisplayRow & {
  groupName: string;
};

export type GroupQualificationPlan = {
  groupRows: Map<string, GroupStandingDisplayRow[]>;
  qualifiedTeamIds: Set<string>;
  bestThirdCandidates: BestThirdCandidate[];
  selectedBestThirds: BestThirdCandidate[];
  directPerGroup: number;
  bestThirdCount: number;
  knockoutSize: number;
};

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

export function buildGroupQualificationPlan({
  event,
  groups,
  groupTeams,
  groupStandings,
  teams,
  matches,
  directPerGroup = 2
}: {
  event: TournamentEvent;
  groups: Group[];
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
  teams: Team[];
  matches: Match[];
  directPerGroup?: number;
}): GroupQualificationPlan {
  const groupRows = new Map<string, GroupStandingDisplayRow[]>();
  const qualifiedTeamIds = new Set<string>();
  const bestThirdCandidates: BestThirdCandidate[] = [];

  for (const group of groups) {
    const rows = rankedGroupRows({
      event,
      group,
      groupTeams,
      groupStandings,
      teams,
      matches
    });

    const hasResults = rows.some((row) => row.played > 0);
    if (!hasResults) {
      groupRows.set(group.id, rows);
      continue;
    }

    rows.forEach((row, index) => {
      if (index < directPerGroup) {
        row.qualificationType = "direct";
        row.qualificationSeed = index + 1;
        qualifiedTeamIds.add(row.teamId);
      } else if (index === directPerGroup) {
        bestThirdCandidates.push({ ...row, groupName: group.name });
      }
    });

    groupRows.set(group.id, rows);
  }

  const directQualifiedCount = qualifiedTeamIds.size;
  const knockoutSize = directQualifiedCount > 0 ? nextPowerOfTwo(directQualifiedCount) : 0;
  const bestThirdCount = Math.min(
    bestThirdCandidates.length,
    Math.max(0, knockoutSize - directQualifiedCount)
  );
  const selectedBestThirds = [...bestThirdCandidates]
    .sort(compareStandingRows)
    .slice(0, bestThirdCount)
    .map((row, index) => ({
      ...row,
      qualificationType: "best_third" as const,
      qualificationSeed: index + 1
    }));
  const selectedThirdSeeds = new Map(selectedBestThirds.map((row) => [row.teamId, row.qualificationSeed]));

  for (const rows of groupRows.values()) {
    for (const row of rows) {
      const seed = selectedThirdSeeds.get(row.teamId);
      if (seed) {
        row.qualificationType = "best_third";
        row.qualificationSeed = seed;
        qualifiedTeamIds.add(row.teamId);
      }
    }
  }

  return {
    groupRows,
    qualifiedTeamIds,
    bestThirdCandidates: [...bestThirdCandidates].sort(compareStandingRows),
    selectedBestThirds,
    directPerGroup,
    bestThirdCount,
    knockoutSize
  };
}

function rankedGroupRows({
  event,
  group,
  groupTeams,
  groupStandings,
  teams,
  matches
}: {
  event: TournamentEvent;
  group: Group;
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
  teams: Team[];
  matches: Match[];
}) {
  const assignedTeamIds = groupTeams
    .filter((row) => row.groupId === group.id)
    .map((row) => row.teamId);
  const groupMatches = matches.filter(
    (match) => match.eventId === event.id && match.groupId === group.id
  );
  const source = groupMatches.some((match) => match.status === "finished")
    ? "computed"
    : groupStandings.some((row) => row.groupId === group.id)
      ? "stored"
      : "empty";
  const rows =
    source === "computed"
      ? computeGroupRows({ event, group, assignedTeamIds, teams, matches: groupMatches })
      : storedOrEmptyGroupRows({ group, assignedTeamIds, groupStandings, teams, source });

  return rows
    .sort(compareStandingRows)
    .map((row, index) => ({
      ...row,
      rankInGroup: index + 1
    }));
}

function computeGroupRows({
  event,
  group,
  assignedTeamIds,
  teams,
  matches
}: {
  event: TournamentEvent;
  group: Group;
  assignedTeamIds: string[];
  teams: Team[];
  matches: Match[];
}): GroupStandingDisplayRow[] {
  const ids = new Set(assignedTeamIds);
  for (const match of matches) {
    if (match.homeTeamId) ids.add(match.homeTeamId);
    if (match.awayTeamId) ids.add(match.awayTeamId);
  }

  const rows = new Map<string, GroupStandingDisplayRow>();
  for (const teamId of ids) {
    rows.set(teamId, emptyGroupRow(group.id, teamId, teamName(teams, teamId), "computed"));
  }

  for (const match of matches.filter((item) => item.status === "finished")) {
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += event.pointsWin;
      away.points += event.pointsLoss;
    } else if (homeScore < awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += event.pointsWin;
      home.points += event.pointsLoss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += event.pointsDraw;
      away.points += event.pointsDraw;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return Array.from(rows.values());
}

function storedOrEmptyGroupRows({
  group,
  assignedTeamIds,
  groupStandings,
  teams,
  source
}: {
  group: Group;
  assignedTeamIds: string[];
  groupStandings: GroupStanding[];
  teams: Team[];
  source: GroupStandingDisplayRow["source"];
}): GroupStandingDisplayRow[] {
  const stored = groupStandings.filter((row) => row.groupId === group.id);
  const rows = stored.length > 0
    ? stored.map((row) => ({
        ...row,
        teamName: teamName(teams, row.teamId),
        rankInGroup: 0,
        source
      }))
    : assignedTeamIds.map((teamId) =>
        emptyGroupRow(group.id, teamId, teamName(teams, teamId), source)
      );

  return rows;
}

function emptyGroupRow(
  groupId: string,
  teamId: string,
  name: string,
  source: GroupStandingDisplayRow["source"]
): GroupStandingDisplayRow {
  return {
    id: `${groupId}-${teamId}`,
    groupId,
    teamId,
    teamName: name,
    rankInGroup: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    source
  };
}

function compareStandingRows<T extends Pick<GroupStandingDisplayRow, "points" | "goalDifference" | "goalsFor" | "goalsAgainst" | "teamName">>(
  a: T,
  b: T
) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.goalsAgainst - b.goalsAgainst ||
    a.teamName.localeCompare(b.teamName)
  );
}

function teamName(teams: Team[], teamId: string) {
  return teams.find((team) => team.id === teamId)?.name ?? "Equipo pendiente";
}

function nextPowerOfTwo(value: number) {
  if (value <= 2) return value <= 0 ? 0 : 2;
  return 2 ** Math.ceil(Math.log2(value));
}
