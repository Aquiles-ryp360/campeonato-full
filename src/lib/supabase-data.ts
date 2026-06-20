import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  emptyCompetitionData,
  mapEvent,
  mapMatch,
  mapPlayer,
  mapTeam,
  type CompetitionData,
  type EventRow,
  type MatchRow,
  type PlayerRow,
  type TeamRow
} from "./data-mappers";

const eventColumns = `
  id,
  name,
  sport,
  category,
  format,
  status,
  registration_fee,
  registration_open_until,
  max_teams,
  min_players,
  max_players,
  points_win,
  points_draw,
  points_loss,
  rules_summary
`;

const publicTeamColumns = `
  id,
  event_id,
  name,
  delegate_name,
  delegate_phone,
  delegate_email,
  primary_color,
  secondary_color,
  status,
  created_at
`;

const playerColumns = `
  id,
  team_id,
  first_name,
  last_name,
  dni,
  student_code,
  enrollment_file,
  semester,
  lineup_role,
  photo_url
`;

const matchColumns = `
  id,
  event_id,
  round,
  home_team_id,
  away_team_id,
  scheduled_at,
  status,
  home_score,
  away_score,
  notes
`;

export async function getPublicCompetitionData(): Promise<CompetitionData> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return emptyCompetitionData;

  const [eventsResponse, teamsResponse, playersResponse, matchesResponse] = await Promise.all([
    supabase.from("events").select(eventColumns).order("created_at", { ascending: true }),
    supabase.from("teams").select(publicTeamColumns).order("created_at", { ascending: true }),
    supabase.from("players").select(playerColumns).order("created_at", { ascending: true }),
    supabase.from("matches").select(matchColumns).order("scheduled_at", { ascending: true })
  ]);

  logSupabaseError("events", eventsResponse.error);
  logSupabaseError("teams", teamsResponse.error);
  logSupabaseError("players", playersResponse.error);
  logSupabaseError("matches", matchesResponse.error);

  return {
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as TeamRow[]).map(mapTeam),
    players: ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    registrationCodes: []
  };
}

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase public env vars are not configured.");
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function logSupabaseError(label: string, error: { message?: string } | null) {
  if (!error) return;
  console.error(`Supabase ${label} query failed: ${error.message ?? "unknown error"}`);
}
