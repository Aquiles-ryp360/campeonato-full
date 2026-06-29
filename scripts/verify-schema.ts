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

const requiredTables = ["events", "teams", "players", "registration_codes", "matches", "profiles"];

for (const table of requiredTables) {
  assert.match(migrationSql, new RegExp(`create\\s+table\\s+public\\.${table}\\b`), `Missing table public.${table}`);
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
assert.match(migrationSql, /create\s+or\s+replace\s+function\s+public\.is_admin/, "is_admin function missing");
assert.match(migrationSql, /admin_events_all/, "Admin events policy missing");
assert.match(migrationSql, /admin_registration_codes_all/, "Admin registration code policy missing");
assert.match(migrationSql, /admin_competition_all_matches/, "Admin matches policy missing");
assert.match(migrationSql, /delegate_update_own_teams/, "Delegate team update policy missing");

console.log("Schema verification passed.");
