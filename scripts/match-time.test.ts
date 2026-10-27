import assert from "node:assert/strict";
import test from "node:test";
import { hideMatchTimes, matchScheduleLabel } from "../src/lib/match-time";
import type { Match } from "../src/lib/types";

const match = (id: string, scheduledAt: string): Match => ({
  id,
  eventId: "ev",
  round: 1,
  stage: "group_stage",
  homeTeamId: "a",
  awayTeamId: "b",
  scheduledAt,
  scheduledEndAt: scheduledAt,
  court: "Cancha 1",
  status: "scheduled"
});

test("hidden times keep the order and the day but not the real hour", () => {
  const hidden = hideMatchTimes([
    match("m2", "2026-10-29T14:30:00.000Z"),
    match("m1", "2026-10-29T12:00:00.000Z")
  ]);
  const byId = new Map(hidden.map((item) => [item.id, item]));

  assert.equal(byId.get("m1")?.scheduleOrder, 1);
  assert.equal(byId.get("m2")?.scheduleOrder, 2);
  assert.ok(byId.get("m1")!.scheduledAt < byId.get("m2")!.scheduledAt);
  // 00:00 de Lima del mismo dia: no queda rastro de 07:00 / 09:30.
  assert.equal(byId.get("m1")?.scheduledAt, "2026-10-29T05:00:00.000Z");
  assert.equal(byId.get("m1")?.scheduledEndAt, undefined);
  assert.equal(matchScheduleLabel(byId.get("m2")!), "29 oct · Partido N.° 2");
});

test("admin keeps the full date and time", () => {
  assert.match(matchScheduleLabel(match("m1", "2026-10-29T12:00:00.000Z")), /\d{2}:\d{2}/);
});
