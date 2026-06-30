import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n")
  .toLowerCase();

const requiredTables = [
  "events",
  "teams",
  "players",
  "registration_codes",
  "matches",
  "profiles",
  "event_categories",
  "event_venues",
  "team_payments",
  "referees",
  "match_referees",
  "match_results",
  "match_events",
  "volleyball_sets"
];

for (const table of requiredTables) {
  const tablePattern = new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+public\\.${table}\\b`);
  assert.match(migrationSql, tablePattern, `Missing table public.${table}`);
  assert.match(
    migrationSql,
    new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`),
    `Missing RLS on public.${table}`
  );
}

assert.match(migrationSql, /create\s+or\s+replace\s+view\s+public\.championships\b/, "Missing championships compatibility view");
assert.match(migrationSql, /created_by\s+uuid\s+references\s+public\.profiles/, "events.created_by FK missing");
assert.match(migrationSql, /event_id\s+uuid\s+not\s+null\s+references\s+public\.events/, "event_id FK missing");
assert.match(migrationSql, /team_id\s+uuid\s+not\s+null\s+references\s+public\.teams/, "players.team_id FK missing");
assert.match(migrationSql, /registration_code_id\s+uuid\s+references\s+public\.registration_codes/, "teams.registration_code_id FK missing");
assert.match(migrationSql, /add\s+column\s+if\s+not\s+exists\s+category_id\s+uuid/, "category_id column missing");
assert.match(migrationSql, /alter\s+table\s+public\.teams\s+alter\s+column\s+category_id\s+set\s+not\s+null/, "teams.category_id not null missing");
assert.match(migrationSql, /alter\s+table\s+public\.matches\s+alter\s+column\s+category_id\s+set\s+not\s+null/, "matches.category_id not null missing");
assert.match(migrationSql, /teams_category_fk/, "teams.category_id FK missing");
assert.match(migrationSql, /matches_category_fk/, "matches.category_id FK missing");
assert.match(migrationSql, /create\s+or\s+replace\s+function\s+public\.is_admin/, "is_admin function missing");
assert.match(migrationSql, /admin_events_all/, "Admin events policy missing");
assert.match(migrationSql, /admin_registration_codes_all/, "Admin registration code policy missing");
assert.match(migrationSql, /admin_competition_all_matches/, "Admin matches policy missing");
assert.match(migrationSql, /admin_event_categories_all/, "Admin categories policy missing");
assert.match(migrationSql, /delegate_update_own_teams/, "Delegate team update policy missing");
assert.match(migrationSql, /add\s+value\s+if\s+not\s+exists\s+'referee'/, "referee role enum value missing");
assert.match(migrationSql, /auto_approve_after_payment/, "auto approval setting missing");
assert.match(migrationSql, /auto_validate_referee_results/, "auto result validation setting missing");
assert.match(migrationSql, /payment_status\s+public\.payment_status/, "teams.payment_status missing");
assert.match(migrationSql, /team_payments_admin/, "Admin payments policy missing");
assert.match(migrationSql, /referees_admin/, "Admin referees policy missing");
assert.match(migrationSql, /match_results_admin/, "Admin result policy missing");

console.log("Schema verification passed.");
