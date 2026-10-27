import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGroupKnockoutMatches,
  buildGroupStageMatches,
  defaultGroupCount,
  drawGroups,
  groupSizes
} from "../src/lib/domain/group-draw";

const ids = (count: number) => Array.from({ length: count }, (_, index) => `t${index + 1}`);

test("group count and sizes follow the championship formats", () => {
  assert.equal(defaultGroupCount(18), 5);
  assert.deepEqual(groupSizes(18, 5), [4, 4, 4, 3, 3]);
  assert.equal(defaultGroupCount(12), 4);
  assert.deepEqual(groupSizes(12, 4), [3, 3, 3, 3]);
});

test("draw places every team exactly once", () => {
  const groups = drawGroups(ids(18), 5);
  const placed = groups.flatMap((group) => group.teamIds);
  assert.equal(placed.length, 18);
  assert.equal(new Set(placed).size, 18);
  assert.deepEqual(groups.map((group) => group.name), ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E"]);
});

test("round robin creates 24 matches for 18 teams in 5 groups", () => {
  const groups = drawGroups(ids(18), 5, () => 0.5);
  const matches = buildGroupStageMatches("ev", groups);
  assert.equal(matches.length, 24);
  assert.ok(matches.every((match) => match.stage === "group_stage" && match.round >= 1 && match.round <= 3));
  // Ningun equipo juega dos veces en la misma fecha.
  for (const round of [1, 2, 3]) {
    const playing = matches.filter((match) => match.round === round).flatMap((match) => [match.homeTeamId, match.awayTeamId]);
    assert.equal(new Set(playing).size, playing.length);
  }
});

test("five groups build preliminary, quarters, semis, third place and final", () => {
  const matches = buildGroupKnockoutMatches({ eventId: "ev", groupCount: 5, firstRound: 4, thirdPlace: true });
  assert.deepEqual(matches.map((match) => match.label), ["P1", "P2", "C1", "C2", "C3", "C4", "S1", "S2", "3L", "F"]);
  const c3 = matches.find((match) => match.label === "C3");
  assert.equal(c3?.homePlaceholder, "1ro Grupo A");
  assert.equal(c3?.awaySourceMatchId, "ev-p1");
  // Cada ganador sabe a que partido y lado avanza.
  const next = (label: string) => matches.find((match) => match.label === label);
  assert.equal(next("P1")?.nextMatchId, "ev-c3");
  assert.equal(next("P1")?.isHomeNext, false);
  assert.equal(next("C1")?.isHomeNext, true);
  assert.equal(next("C2")?.isHomeNext, false);
  assert.equal(next("S1")?.isHomeNext, true);
  assert.equal(next("S2")?.isHomeNext, false);
  assert.ok(matches.filter((match) => match.label !== "F" && match.label !== "3L").every((match) => match.nextMatchId));
});

test("four groups build quarters to final without third place", () => {
  const matches = buildGroupKnockoutMatches({ eventId: "ev", groupCount: 4, firstRound: 4, thirdPlace: false });
  assert.deepEqual(matches.map((match) => match.label), ["C1", "C2", "C3", "C4", "S1", "S2", "F"]);
  assert.equal(matches[0].homePlaceholder, "1ro Grupo A");
  assert.equal(matches[0].awayPlaceholder, "2do Grupo B");
});

test("group count adapts to registered teams using supported brackets", () => {
  const cases: Array<[number, number]> = [[3, 1], [4, 2], [9, 2], [10, 4], [16, 4], [17, 5], [24, 5]];
  for (const [teams, groups] of cases) assert.equal(defaultGroupCount(teams), groups, `${teams} equipos`);
});
