import assert from "node:assert/strict";
import test from "node:test";
import {
  clashOptions,
  findClashes,
  internalViolations,
  linkTeams,
  resolveAllClashes,
  shiftEventAfter
} from "../src/lib/domain/cross-event-clashes";
import type { Match, Player, Team, TournamentEvent } from "../src/lib/types";

const event = (id: string) =>
  ({
    id,
    minimumRestMinutes: 0,
    scheduleConfig: { matchDurationMinutes: 20 }
  }) as unknown as TournamentEvent;
const team = (id: string, eventId: string, name: string) => ({ id, eventId, name }) as Team;
const player = (teamId: string, dni: string) => ({ teamId, dni }) as Player;
const at = (minute: number) => new Date(Date.UTC(2026, 9, 29, 13, minute)).toISOString();
const match = (
  id: string,
  eventId: string,
  home: string,
  away: string,
  minute: number,
  court = "Cancha A"
) =>
  ({
    id,
    eventId,
    homeTeamId: home,
    awayTeamId: away,
    scheduledAt: at(minute),
    scheduledEndAt: at(minute + 20),
    court,
    stage: "group_stage",
    status: "scheduled",
    round: 1
  }) as Match;

const events = [event("fut"), event("vol")];
const teams = [
  team("f1", "fut", "Salsitas al poder"),
  team("f2", "fut", "ETS"),
  team("f3", "fut", "MEKA"),
  team("f4", "fut", "Polquitos"),
  team("v1", "vol", "SALSITAS  al Poder"),
  team("v2", "vol", "Reyes"),
  team("v3", "vol", "Invencibles"),
  team("v4", "vol", "Otro")
];

test("teams link across sports by name or shared players", () => {
  const links = linkTeams(teams, [player("f2", "111"), player("v3", "111")]);
  assert.deepEqual(
    links.map((link) => [link.a.id, link.b.id, link.reason]),
    [
      ["f1", "v1", "nombre"],
      ["f2", "v3", "jugadores"]
    ]
  );
});

test("detects the clash and offers fixes that leave zero clashes", () => {
  const links = linkTeams(teams, []);
  const matches = [
    match("m1", "fut", "f1", "f2", 0),
    match("m2", "fut", "f3", "f4", 25),
    match("m3", "vol", "v1", "v2", 5),
    match("m4", "vol", "v3", "v4", 40)
  ];
  const clashes = findClashes(matches, events, links);
  assert.equal(clashes.length, 1);

  const options = clashOptions(clashes[0], matches, events, links);
  assert.ok(options.length > 0);
  for (const option of options) {
    const next = matches.map((item) => {
      const move = option.moves.find((m) => m.id === item.id);
      return move ? { ...item, ...move, venueId: move.venueId ?? undefined } : item;
    });
    assert.equal(findClashes(next, events, links).length, option.clashesAfter, option.key);
    assert.equal(internalViolations(next, events), 0, option.key);
  }
  assert.equal(options[0].clashesAfter, 0);
});

test("global fixes clear every clash", () => {
  const links = linkTeams(teams, [player("f2", "111"), player("v3", "111")]);
  const matches = [
    match("m1", "fut", "f1", "f2", 0),
    match("m2", "fut", "f3", "f4", 25),
    match("m3", "vol", "v1", "v2", 5),
    match("m4", "vol", "v3", "v4", 10, "Cancha B")
  ];
  assert.equal(findClashes(matches, events, links).length, 2);
  assert.equal(resolveAllClashes(matches, events, links)?.clashesAfter, 0);
  const shift = shiftEventAfter("vol", "fut", matches, events, links);
  assert.equal(shift?.clashesAfter, 0);
  assert.equal(shift?.delayMinutes, 50);
});
