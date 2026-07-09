import assert from "node:assert/strict";
import test from "node:test";
import { generateKnockoutBracket } from "../src/lib/domain/bracket-generator";
import {
  buildEventFixturePreview,
  buildFixtureTeamFingerprint,
  buildVisibleFixtureMatches,
  fixtureStatusForVisibleMatches
} from "../src/lib/domain/fixture-preview";
import { generateOneDaySchedule } from "../src/lib/domain/schedule-generator";
import { buildGroupQualificationPlan } from "../src/lib/domain/standings";
import type { Group, GroupStanding, GroupTeam, Team, TournamentEvent, Venue } from "../src/lib/types";

const baseEvent: TournamentEvent = {
  id: "event-1",
  name: "Campeonato prueba",
  sportId: "sport-futbol",
  sport: "futbol",
  category: "Libre",
  formatId: "format-knockout",
  format: "single_elimination",
  status: "registration",
  registrationFee: 0,
  registrationOpenUntil: "2026-07-08T23:59:00.000Z",
  maxTeams: 12,
  minPlayers: 1,
  maxPlayers: 18,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  rulesSummary: "",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 60,
  thirdPlace: true
};

test("knockout bracket for 12 teams creates preliminaries and direct byes", () => {
  const teams = Array.from({ length: 12 }, (_, index) => team(index + 1));
  const bracket = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams,
    thirdPlace: true
  });

  assert.equal(bracket.status, "complete");
  assert.equal(bracket.bracketSize, 16);
  assert.equal(bracket.lowerPowerOfTwo, 8);
  assert.equal(bracket.preliminaryMatches, 4);
  assert.equal(bracket.preliminaryTeams, 8);
  assert.equal(bracket.byeCount, 4);
  assert.equal(bracket.rounds.find((round) => round.stage === "preliminary")?.slots.length, 4);
  assert.equal(bracket.rounds.find((round) => round.stage === "quarter_finals")?.slots.length, 4);
});

test("draft knockout preview does not reuse stale teams in dependent rounds", () => {
  const teams = Array.from({ length: 12 }, (_, index) => team(index + 1));
  const staleSixTeamFixture = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams: teams.slice(0, 6),
    thirdPlace: true,
    fixtureStatus: "draft_auto"
  }).matches;
  const bracket = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams,
    matches: staleSixTeamFixture,
    thirdPlace: true,
    fixtureStatus: "draft_auto"
  });
  const labels = new Map(bracket.matches.map((match) => [match.label, match]));
  const assignedTeamIds = bracket.matches.flatMap((match) =>
    [match.homeTeamId, match.awayTeamId].filter(Boolean)
  );

  assert.equal(labels.get("P1")?.homeTeamId, "team-5");
  assert.equal(labels.get("P1")?.awayTeamId, "team-12");
  assert.equal(labels.get("S1")?.homePlaceholder, "Ganador C1");
  assert.equal(labels.get("S1")?.awayPlaceholder, "Ganador C2");
  assert.equal(labels.get("S1")?.homeTeamId, "");
  assert.equal(labels.get("S1")?.awayTeamId, "");
  assert.equal(labels.get("S2")?.homePlaceholder, "Ganador C3");
  assert.equal(labels.get("S2")?.awayPlaceholder, "Ganador C4");
  assert.equal(labels.get("S2")?.homeTeamId, "");
  assert.equal(labels.get("S2")?.awayTeamId, "");
  assert.equal(new Set(assignedTeamIds).size, assignedTeamIds.length);
});

test("knockout bracket stays compact when active teams are below max teams", () => {
  const teams = Array.from({ length: 6 }, (_, index) => team(index + 1));
  const bracket = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams,
    maxTeams: 12,
    thirdPlace: false,
    seedingMode: "random",
    randomSeed: "compact-six-team-draw",
    fixtureStatus: "draft_auto"
  });
  const assignedTeamIds = bracket.matches.flatMap((match) =>
    [match.homeTeamId, match.awayTeamId].filter(Boolean)
  );

  assert.equal(bracket.status, "complete");
  assert.equal(bracket.bracketSize, 8);
  assert.equal(bracket.lowerPowerOfTwo, 4);
  assert.equal(bracket.preliminaryMatches, 2);
  assert.equal(bracket.preliminaryTeams, 4);
  assert.equal(bracket.byeCount, 2);
  assert.equal(bracket.matches.length, 5);
  assert.equal(bracket.rounds.find((round) => round.stage === "preliminary")?.slots.length, 2);
  assert.equal(bracket.rounds.find((round) => round.stage === "semi_finals")?.slots.length, 2);
  assert.equal(new Set(assignedTeamIds).size, assignedTeamIds.length);
});

test("knockout bracket respects disabled byes", () => {
  const teams = Array.from({ length: 12 }, (_, index) => team(index + 1));
  const bracket = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams,
    thirdPlace: true,
    allowByes: false,
    maxTeams: 12
  });

  assert.equal(bracket.status, "incomplete");
  assert.equal(bracket.matches.length, 0);
  assert.match(bracket.warnings.join(" "), /sin byes/);
});

test("fixture preview uses only active teams and keeps random draw stable", () => {
  const activeTeams = Array.from({ length: 12 }, (_, index) => team(index + 1));
  const inactive = {
    ...team(13),
    id: "team-rejected",
    name: "Equipo rechazado",
    status: "rejected" as const
  };
  const event: TournamentEvent = {
    ...baseEvent,
    seedingMode: "random",
    eventDate: "2026-07-10T08:00:00-05:00",
    fixtureStatus: "draft_auto",
    scheduleConfig: {
      startTime: "08:00",
      matchDurationMinutes: 20,
      transitionMinutes: 10,
      courts: ["Cancha A", "Cancha B"],
      minimumRestMinutes: 40,
      allowCompactPreview: true
    }
  };
  const venues: Venue[] = [
    { id: "venue-a", name: "Cancha A", active: true },
    { id: "venue-b", name: "Cancha B", active: true }
  ];
  const firstPreview = buildEventFixturePreview({
    event,
    teams: [...activeTeams, inactive],
    matches: [],
    venues
  });
  const secondPreview = buildEventFixturePreview({
    event,
    teams: [...activeTeams, inactive],
    matches: [],
    venues
  });

  assert(firstPreview);
  assert(secondPreview);
  assert.equal(firstPreview.teams.length, 12);
  assert.equal(firstPreview.bracket.preliminaryMatches, 4);
  assert(!firstPreview.matches.some((match) => match.homeTeamId === inactive.id || match.awayTeamId === inactive.id));
  assert.deepEqual(
    firstPreview.matches.map((match) => [match.label, match.homeTeamId, match.awayTeamId]),
    secondPreview.matches.map((match) => [match.label, match.homeTeamId, match.awayTeamId])
  );
});

test("published visible fixture uses latest active teams and keeps exhibition match", () => {
  const activeTeams = Array.from({ length: 11 }, (_, index) => team(index + 1));
  const rejected = {
    ...team(12),
    id: "team-rejected",
    name: "Equipo exhibicion",
    status: "rejected" as const
  };
  const event: TournamentEvent = {
    ...baseEvent,
    thirdPlace: false,
    fixtureStatus: "published",
    eventDate: "2026-07-09T05:00:00+00:00",
    scheduleConfig: {
      startTime: "08:00",
      matchDurationMinutes: 25,
      transitionMinutes: 10,
      courts: ["Cancha A"],
      minimumRestMinutes: 35,
      allowCompactPreview: true
    }
  };
  const stalePublishedMatch = {
    ...generateKnockoutBracket({
      eventId: event.id,
      teams: activeTeams.slice(0, 9),
      thirdPlace: false,
      fixtureStatus: "published"
    }).matches[0],
    id: "db-published-p1",
    label: "P1"
  };
  const exhibitionMatch = {
    ...stalePublishedMatch,
    id: "db-exhibition",
    label: "EX",
    stage: "group_stage" as const,
    homeTeamId: rejected.id,
    awayTeamId: activeTeams[0].id,
    notes: "Partido de exhibicion."
  };
  const matches = buildVisibleFixtureMatches({
    events: [event],
    teams: [...activeTeams, rejected],
    matches: [stalePublishedMatch, exhibitionMatch],
    venues: []
  });
  const official = matches.filter((match) => match.label !== "EX");
  const preliminaries = official.filter((match) => match.stage === "preliminary");
  const latestP1 = preliminaries.find((match) => match.label === "P1");
  const latestC4 = official.find((match) => match.label === "C4");
  const exhibition = matches.find((match) => match.label === "EX");

  assert.equal(official.length, 10);
  assert.equal(preliminaries.length, 3);
  assert.equal(latestP1?.homeTeamId, "team-6");
  assert.equal(latestP1?.awayTeamId, "team-11");
  assert.equal(exhibition?.id, "db-exhibition");
  assert(exhibition?.scheduledAt && latestC4?.scheduledAt);
  assert(exhibition.scheduledAt > latestC4.scheduledAt);
});

test("published regenerated fixture reuses saved draw by bracket label", () => {
  const activeTeams = Array.from({ length: 11 }, (_, index) => team(index + 1));
  const savedSeed = "admin-regenerated-draw";
  const savedFixture = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams: activeTeams,
    thirdPlace: false,
    seedingMode: "random",
    randomSeed: savedSeed,
    fixtureStatus: "published"
  }).matches.map((match) => ({
    ...match,
    id: `db-${match.label}`,
    scheduledAt: `2026-07-09T${String(8 + match.round).padStart(2, "0")}:00:00.000Z`
  }));
  const event: TournamentEvent = {
    ...baseEvent,
    seedingMode: "random",
    thirdPlace: false,
    fixtureStatus: "published",
    eventDate: "2026-07-09T05:00:00+00:00",
    scheduleConfig: {
      startTime: "08:00",
      matchDurationMinutes: 25,
      transitionMinutes: 10,
      courts: ["Cancha A"],
      minimumRestMinutes: 35,
      allowCompactPreview: true,
      fixtureRandomSeed: savedSeed,
      fixtureTeamFingerprint: buildFixtureTeamFingerprint(activeTeams)
    }
  };
  const visible = buildVisibleFixtureMatches({
    events: [event],
    teams: activeTeams,
    matches: savedFixture,
    venues: []
  });
  const p1 = visible.find((match) => match.label === "P1");
  const savedP1 = savedFixture.find((match) => match.label === "P1");

  assert.equal(p1?.id, "db-P1");
  assert.equal(p1?.homeTeamId, savedP1?.homeTeamId);
  assert.equal(p1?.awayTeamId, savedP1?.awayTeamId);
  assert.equal(p1?.scheduledAt, savedP1?.scheduledAt);
});

test("visible fixture matches drive bracket display even while fixture is draft", () => {
  const activeTeams = Array.from({ length: 10 }, (_, index) => team(index + 1));
  const savedFixture = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams: activeTeams,
    thirdPlace: false,
    seedingMode: "random",
    randomSeed: "saved-voley-draw",
    fixtureStatus: "published"
  }).matches.map((match) =>
    match.label === "P1"
      ? {
          ...match,
          id: "db-P1",
          homeTeamId: "team-1",
          awayTeamId: "team-2",
          homePlaceholder: "Equipo 1",
          awayPlaceholder: "Equipo 2"
        }
      : match
  );
  const event: TournamentEvent = {
    ...baseEvent,
    sport: "voley",
    seedingMode: "random",
    thirdPlace: false,
    fixtureStatus: "draft_auto"
  };
  const displayBracket = generateKnockoutBracket({
    eventId: event.id,
    teams: activeTeams,
    matches: savedFixture,
    thirdPlace: false,
    seedingMode: "random",
    randomSeed: "different-preview-draw",
    fixtureStatus: fixtureStatusForVisibleMatches(event, savedFixture)
  });
  const p1 = displayBracket.matches.find((match) => match.label === "P1");

  assert.equal(p1?.id, "db-P1");
  assert.equal(p1?.homeTeamId, "team-1");
  assert.equal(p1?.awayTeamId, "team-2");
});

test("one day schedule interprets configured start time as Peru time", () => {
  const match = generateKnockoutBracket({
    eventId: baseEvent.id,
    teams: [team(1), team(2)],
    thirdPlace: false,
    fixtureStatus: "draft_auto"
  }).matches[0];
  const schedule = generateOneDaySchedule([match], {
    eventDate: "2026-07-09T05:00:00+00:00",
    startTime: "08:00",
    matchDurationMinutes: 30,
    transitionMinutes: 10,
    courts: ["Cancha A"],
    minimumRestMinutes: 30,
    respectRoundDependencies: true,
    allowCompactPreview: true
  });

  assert.equal(schedule.matches[0]?.scheduledAt, "2026-07-09T13:00:00.000Z");
});

test("group qualification adds best thirds to complete knockout size", () => {
  const groups: Group[] = ["A", "B", "C"].map((name, index) => ({
    id: `group-${name}`,
    eventId: baseEvent.id,
    name: `Grupo ${name}`,
    createdAt: `2026-07-0${index + 1}T08:00:00.000Z`
  }));
  const teams = Array.from({ length: 12 }, (_, index) => team(index + 1));
  const groupTeams: GroupTeam[] = teams.map((current, index) => ({
    id: `gt-${current.id}`,
    groupId: groups[Math.floor(index / 4)].id,
    teamId: current.id
  }));
  const groupStandings: GroupStanding[] = [
    standing(groups[0], teams[0], 9, 5, 7, 3),
    standing(groups[0], teams[1], 6, 2, 4, 3),
    standing(groups[0], teams[2], 4, 1, 3, 3),
    standing(groups[0], teams[3], 0, -8, 1, 3),
    standing(groups[1], teams[4], 7, 3, 5, 3),
    standing(groups[1], teams[5], 6, 2, 4, 3),
    standing(groups[1], teams[6], 3, -1, 2, 3),
    standing(groups[1], teams[7], 1, -4, 1, 3),
    standing(groups[2], teams[8], 9, 6, 8, 3),
    standing(groups[2], teams[9], 5, 1, 4, 3),
    standing(groups[2], teams[10], 4, 0, 4, 3),
    standing(groups[2], teams[11], 1, -7, 1, 3)
  ];

  const plan = buildGroupQualificationPlan({
    event: { ...baseEvent, format: "groups_then_knockout" },
    groups,
    groupTeams,
    groupStandings,
    teams,
    matches: []
  });

  assert.equal(plan.knockoutSize, 8);
  assert.equal(plan.bestThirdCount, 2);
  assert.equal(plan.qualifiedTeamIds.size, 8);
  assert.deepEqual(plan.selectedBestThirds.map((row) => row.teamId), ["team-3", "team-11"]);
  assert.equal(plan.groupRows.get("group-A")?.[2].qualificationType, "best_third");
  assert.equal(plan.groupRows.get("group-B")?.[2].qualificationType, undefined);
  assert.equal(plan.groupRows.get("group-C")?.[2].qualificationType, "best_third");
});

function team(seed: number): Team {
  return {
    id: `team-${seed}`,
    eventId: baseEvent.id,
    name: `Equipo ${seed}`,
    delegateName: "Delegado",
    delegatePhone: "999999999",
    delegateEmail: `team-${seed}@example.com`,
    paymentMethod: "yape",
    registrationCode: `CODE${seed}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#111111",
    secondaryColor: "#ffffff",
    createdAt: `2026-07-${String(seed).padStart(2, "0")}T08:00:00.000Z`
  };
}

function standing(
  group: Group,
  currentTeam: Team,
  points: number,
  goalDifference: number,
  goalsFor: number,
  played: number
): GroupStanding {
  return {
    id: `standing-${group.id}-${currentTeam.id}`,
    groupId: group.id,
    teamId: currentTeam.id,
    played,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDifference,
    goalDifference,
    points
  };
}
