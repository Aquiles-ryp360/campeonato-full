import assert from "node:assert/strict";
import test from "node:test";
import { scoreFromLiveEvents } from "../src/lib/live-event-score";

const match = {
  homeTeamId: "home",
  awayTeamId: "away"
};

test("live event score counts goals, own goals and penalty shootout separately", () => {
  const score = scoreFromLiveEvents(match, [
    { teamId: "home", eventType: "goal" },
    { teamId: "away", eventType: "goal" },
    { teamId: "home", eventType: "own_goal" },
    { teamId: "home", eventType: "penalty_goal" },
    { teamId: "home", eventType: "penalty_scored" },
    { teamId: "away", eventType: "penalty_scored" },
    { teamId: "away", eventType: "yellow_card" }
  ]);

  assert.deepEqual(score, {
    homeScore: 2,
    awayScore: 2,
    penaltyHomeScore: 1,
    penaltyAwayScore: 1
  });
});

test("live event score ignores corrected events and non-scoring cards", () => {
  const score = scoreFromLiveEvents(match, [
    { teamId: "home", eventType: "goal", correctedAt: "2026-07-01T20:00:00.000Z" },
    { teamId: "away", eventType: "red_card" },
    { teamId: "away", eventType: "penalty_missed_tiebreak" }
  ]);

  assert.deepEqual(score, {
    homeScore: 0,
    awayScore: 0,
    penaltyHomeScore: 0,
    penaltyAwayScore: 0
  });
});
