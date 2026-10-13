import assert from "node:assert/strict";
import test from "node:test";
import { buildFutbol18Seed, futbol18Event, futbol18EventId } from "../src/lib/futbol-18-seed";
import { buildGroupQualificationPlan } from "../src/lib/domain/standings";
import { detectScheduleConflicts } from "../src/lib/domain/conflict-detector";
import type { GroupStanding, MatchStage } from "../src/lib/types";

const data = buildFutbol18Seed();

function matchesByStage(stage: MatchStage) {
  return data.matches.filter((match) => match.eventId === futbol18EventId && match.stage === stage);
}

test("seed carga 18 equipos y la distribucion de grupos 4,4,4,3,3", () => {
  assert.equal(data.events.length, 1);
  assert.equal(data.teams.length, 18);
  assert.equal(data.groups.length, 5);

  const sizes = data.groups.map(
    (group) => data.groupTeams.filter((row) => row.groupId === group.id).length
  );
  assert.deepEqual(sizes, [4, 4, 4, 3, 3]);
  assert.equal(new Set(data.groupTeams.map((row) => row.teamId)).size, 18);
});

test("fase de grupos genera 24 partidos con el formato round robin esperado", () => {
  const groupMatches = matchesByStage("group_stage");
  assert.equal(groupMatches.length, 24);

  for (const group of data.groups) {
    const count = groupMatches.filter((match) => match.groupId === group.id).length;
    const teamCount = data.groupTeams.filter((row) => row.groupId === group.id).length;
    assert.equal(count, (teamCount * (teamCount - 1)) / 2);
  }
});

test("fase final arma la llave de 10 equipos con preliminar, cuartos, semis, tercer lugar y final", () => {
  assert.equal(matchesByStage("preliminary").length, 2);
  assert.equal(matchesByStage("quarter_finals").length, 4);
  assert.equal(matchesByStage("semi_finals").length, 2);
  assert.equal(matchesByStage("third_place").length, 1);
  assert.equal(matchesByStage("final").length, 1);
  assert.equal(data.matches.length, 34);

  const quarters = matchesByStage("quarter_finals");
  const dependencies = quarters.flatMap((match) => match.dependsOnMatchIds ?? []);
  assert(dependencies.includes(`${futbol18EventId}-p1`));
  assert(dependencies.includes(`${futbol18EventId}-p2`));
});

test("clasifican solo los dos primeros de cada grupo (10 equipos, sin mejores terceros)", () => {
  const groupStandings = buildSyntheticStandings();
  const plan = buildGroupQualificationPlan({
    event: futbol18Event,
    groups: data.groups,
    groupTeams: data.groupTeams,
    groupStandings,
    teams: data.teams,
    matches: []
  });

  assert.equal(plan.directPerGroup, 2);
  assert.equal(plan.qualifiedTeamIds.size, 10);
  assert.equal(plan.bestThirdCount, 0);
  assert.equal(plan.knockoutSize, 10);
  assert.equal(plan.selectedBestThirds.length, 0);
  assert.equal(futbol18Event.qualifyBestThirds, false);
});

test("la llave de 10 equipos no fuerza terceros ni siquiera con mejores terceros habilitados", () => {
  const groupStandings = buildSyntheticStandings();
  const plan = buildGroupQualificationPlan({
    event: { ...futbol18Event, qualifyBestThirds: true },
    groups: data.groups,
    groupTeams: data.groupTeams,
    groupStandings,
    teams: data.teams,
    matches: [],
    includeBestThirds: true
  });

  assert.equal(plan.qualifiedTeamIds.size, 10);
  assert.equal(plan.bestThirdCount, 0);
  assert.equal(plan.knockoutSize, 10);
});

test("el fixture de 34 partidos se programa en dos canchas sin choques de cancha ni de equipo", () => {
  const matches = data.matches.filter((match) => match.eventId === futbol18EventId);
  assert.equal(matches.length, 34);
  assert(matches.every((match) => match.scheduledAt));

  const first = matches.reduce((earliest, match) =>
    match.scheduledAt < earliest.scheduledAt ? match : earliest
  );
  assert.equal(first.scheduledAt, "2026-08-15T13:00:00.000Z");

  const conflicts = detectScheduleConflicts({
    matches,
    teams: data.teams,
    players: data.players,
    events: data.events
  });
  assert(!conflicts.some((conflict) => conflict.type === "court" && conflict.severity === "error"));
  assert(!conflicts.some((conflict) => conflict.type === "team" && conflict.severity === "error"));

  const courtSlots = new Set<string>();
  for (const match of matches) {
    const key = `${match.court}-${match.scheduledAt}`;
    assert(!courtSlots.has(key), `Cancha duplicada a la misma hora: ${key}`);
    courtSlots.add(key);
  }
});

function buildSyntheticStandings(): GroupStanding[] {
  return data.groups.flatMap((group) => {
    const teamIds = data.groupTeams
      .filter((row) => row.groupId === group.id)
      .map((row) => row.teamId);
    return teamIds.map((teamId, index) => ({
      id: `standing-${group.id}-${teamId}`,
      groupId: group.id,
      teamId,
      played: 3,
      won: Math.max(0, 3 - index),
      drawn: 0,
      lost: index,
      goalsFor: Math.max(1, 9 - index * 3),
      goalsAgainst: index * 2,
      goalDifference: Math.max(1, 9 - index * 3) - index * 2,
      points: Math.max(0, 9 - index * 3)
    }));
  });
}
