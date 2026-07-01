import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const refereeMigration = readFileSync("supabase/migrations/010_referee_live_module.sql", "utf8");
const penaltyMigration = readFileSync("supabase/migrations/011_penalty_live_flow.sql", "utf8");

for (const column of [
  "penalty_home_score",
  "penalty_away_score",
  "winner_team_id",
  "penalty_order",
  "corrected_at",
  "corrected_by",
  "correction_reason"
]) {
  assert(
    refereeMigration.includes(column),
    `Missing referee live schema column or field: ${column}`
  );
}

for (const eventType of [
  "penalties_started",
  "penalties_finished",
  "bracket_updated",
  "penalty_scored",
  "penalty_missed_tiebreak"
]) {
  assert(
    penaltyMigration.includes(`'${eventType}'`),
    `Missing penalty event type in migration 011: ${eventType}`
  );
}

assert(
  penaltyMigration.includes("match_live_events_penalty_order_idx"),
  "Missing penalty order index"
);

console.log("Schema verification passed.");
