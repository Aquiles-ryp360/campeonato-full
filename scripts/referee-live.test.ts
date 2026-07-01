import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMatchScore,
  liveStatusLabel,
  splitPublicLiveMatches,
  summarizePenaltyShootout
} from "../src/lib/live-match";
import type { Match, MatchLiveEvent } from "../src/lib/types";

const match: Match = {
  id: "match-1",
  eventId: "event-1",
  round: 1,
  stage: "final",
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  scheduledAt: "2026-07-01T20:00:00.000Z",
  court: "Cancha 1",
  status: "scheduled",
  liveStatus: "penalties",
  homeScore: 1,
  awayScore: 1,
  penaltyHomeScore: 2,
  penaltyAwayScore: 1
};

test("summarizePenaltyShootout counts active penalty goals and misses by team", () => {
  const summary = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10),
    penalty("p2", "team-away", "penalty_scored", 2, 11),
    penalty("p3", "team-home", "penalty_missed_tiebreak", 3, 7),
    penalty("p4", "team-away", "penalty_missed_tiebreak", 4, 8, "2026-07-01T20:05:00.000Z"),
    penalty("p5", "team-home", "penalty_scored", 5, 9)
  ]);

  assert.equal(summary.homeAttempts, 3);
  assert.equal(summary.awayAttempts, 1);
  assert.equal(summary.homeScore, 2);
  assert.equal(summary.awayScore, 1);
  assert.equal(summary.winnerTeamId, "team-home");
  assert.equal(summary.nextSide, "away");
  assert.deepEqual(summary.home.map((attempt) => attempt.jerseyNumber), [10, 7, 9]);
});

test("formatMatchScore keeps regulation goals separate from penalty score", () => {
  assert.equal(formatMatchScore(match), "1 (2) - 1 (1)");
  assert.equal(match.homeScore, 1);
  assert.equal(match.awayScore, 1);
});

test("splitPublicLiveMatches highlights active live matches before review states", () => {
  const live: Match = {
    ...match,
    id: "live",
    liveStatus: "in_progress_second_half",
    scheduledAt: "2026-07-01T21:00:00.000Z"
  };
  const review: Match = {
    ...match,
    id: "review",
    liveStatus: "submitted",
    scheduledAt: "2026-07-01T19:00:00.000Z"
  };
  const scheduled: Match = {
    ...match,
    id: "scheduled",
    liveStatus: "scheduled",
    scheduledAt: "2026-07-01T18:00:00.000Z"
  };

  const result = splitPublicLiveMatches([review, scheduled, live]);

  assert.equal(result.primary?.id, "live");
  assert.deepEqual(result.secondary.map((item) => item.id), ["review"]);
});

test("liveStatusLabel hides technical statuses from public copy", () => {
  assert.equal(liveStatusLabel("submitted"), "En evaluacion");
  assert.equal(liveStatusLabel("under_review"), "En evaluacion");
  assert.equal(liveStatusLabel("in_progress_first_half"), "Primer tiempo");
});

function penalty(
  id: string,
  teamId: string,
  eventType: "penalty_scored" | "penalty_missed_tiebreak",
  penaltyOrder: number,
  jerseyNumber: number,
  correctedAt?: string
): MatchLiveEvent {
  return {
    id,
    matchId: match.id,
    teamId,
    playerId: `${id}-player`,
    jerseyNumber,
    eventType,
    period: "penalties",
    minute: 90,
    penaltyOrder,
    createdAt: `2026-07-01T20:0${penaltyOrder}:00.000Z`,
    correctedAt
  };
}
