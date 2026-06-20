"use client";

import {
  emptyCompetitionData,
  mapEvent,
  mapMatch,
  mapPlayer,
  mapRegistrationCode,
  mapTeam,
  type CompetitionData,
  type EventRow,
  type MatchRow,
  type PlayerRow,
  type RegistrationCodeRow,
  type TeamRow
} from "./data-mappers";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "./supabase";

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

const teamColumns = `
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

const teamColumnsWithCode = `
  ${teamColumns},
  registration_code:registration_code_id (
    id,
    code,
    method,
    status
  )
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

const registrationCodeColumns = `
  id,
  event_id,
  code,
  method,
  status,
  used_by_team_id
`;

export async function fetchBrowserCompetitionData({
  includeRegistrationCodes = false
}: {
  includeRegistrationCodes?: boolean;
} = {}): Promise<CompetitionData> {
  if (!hasSupabaseEnv()) return emptyCompetitionData;

  const supabase = createSupabaseBrowserClient();
  const teamSelect = includeRegistrationCodes ? teamColumnsWithCode : teamColumns;

  const [eventsResponse, teamsResponse, playersResponse, matchesResponse, codesResponse] =
    await Promise.all([
      supabase.from("events").select(eventColumns).order("created_at", { ascending: true }),
      supabase.from("teams").select(teamSelect).order("created_at", { ascending: true }),
      supabase.from("players").select(playerColumns).order("created_at", { ascending: true }),
      supabase.from("matches").select(matchColumns).order("scheduled_at", { ascending: true }),
      includeRegistrationCodes
        ? supabase
            .from("registration_codes")
            .select(registrationCodeColumns)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

  if (eventsResponse.error) throw new Error("No se pudieron cargar los eventos.");
  if (teamsResponse.error) throw new Error("No se pudieron cargar los equipos.");
  if (playersResponse.error) throw new Error("No se pudieron cargar los jugadores.");
  if (matchesResponse.error) throw new Error("No se pudieron cargar los partidos.");
  if (codesResponse.error) throw new Error("No se pudieron cargar los codigos.");

  return {
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as unknown as TeamRow[]).map(mapTeam),
    players: ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    registrationCodes: ((codesResponse.data ?? []) as RegistrationCodeRow[]).map(
      mapRegistrationCode
    )
  };
}
