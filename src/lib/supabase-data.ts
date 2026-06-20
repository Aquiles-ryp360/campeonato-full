import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  emptyCompetitionData,
  mapEvent,
  mapMatch,
  mapPlayer,
  mapTeam,
  mapSport,
  mapCompetitionFormat,
  mapVenue,
  mapTimeSlot,
  mapGroup,
  mapGroupTeam,
  mapGroupStanding,
  mapTournamentBases,
  type CompetitionData,
  type EventRow,
  type MatchRow,
  type PlayerRow,
  type TeamRow,
  type SportRow,
  type CompetitionFormatRow,
  type VenueRow,
  type TimeSlotRow,
  type GroupRow,
  type GroupTeamRow,
  type GroupStandingRow,
  type TournamentBasesRow
} from "./data-mappers";

const eventColumns = `
  id,
  name,
  sport_id,
  category,
  format_id,
  status,
  registration_fee,
  registration_open_until,
  max_teams,
  min_players,
  max_players,
  points_win,
  points_draw,
  points_loss,
  rules_summary,
  prevent_cross_sport_conflicts,
  minimum_rest_minutes
`;

const publicTeamColumns = `
  id,
  event_id,
  name,
  delegate_name,
  delegate_phone,
  delegate_email,
  academic_career,
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
  stage,
  group_id,
  bracket_position,
  next_match_id,
  is_home_next,
  home_team_id,
  away_team_id,
  scheduled_at,
  venue_id,
  status,
  home_score,
  away_score,
  notes
`;

export async function getPublicCompetitionData(): Promise<CompetitionData> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return emptyCompetitionData;

  const [
    eventsResponse,
    teamsResponse,
    playersResponse,
    matchesResponse,
    sportsResponse,
    formatsResponse,
    venuesResponse,
    slotsResponse,
    groupsResponse,
    groupTeamsResponse,
    groupStandingsResponse,
    basesResponse
  ] = await Promise.all([
    supabase.from("events").select(eventColumns).order("created_at", { ascending: true }),
    supabase.from("teams").select(publicTeamColumns).order("created_at", { ascending: true }),
    supabase.from("players").select(playerColumns).order("created_at", { ascending: true }),
    supabase.from("matches").select(matchColumns).order("scheduled_at", { ascending: true }),
    supabase.from("sports").select("*").order("name", { ascending: true }),
    supabase.from("competition_formats").select("*").order("name", { ascending: true }),
    supabase.from("venues").select("*").order("name", { ascending: true }),
    supabase.from("time_slots").select("*").order("day_of_week", { ascending: true }),
    supabase.from("groups").select("*").order("name", { ascending: true }),
    supabase.from("group_teams").select("*").order("created_at", { ascending: true }),
    supabase.from("group_standings").select("*").order("points", { ascending: false }),
    supabase.from("tournament_bases").select("*").order("created_at", { ascending: true })
  ]);

  logSupabaseError("events", eventsResponse.error);
  logSupabaseError("teams", teamsResponse.error);
  logSupabaseError("players", playersResponse.error);
  logSupabaseError("matches", matchesResponse.error);
  logSupabaseError("sports", sportsResponse.error);
  logSupabaseError("competition_formats", formatsResponse.error);
  logSupabaseError("venues", venuesResponse.error);
  logSupabaseError("time_slots", slotsResponse.error);
  logSupabaseError("groups", groupsResponse.error);
  logSupabaseError("group_teams", groupTeamsResponse.error);
  logSupabaseError("group_standings", groupStandingsResponse.error);
  logSupabaseError("tournament_bases", basesResponse.error);

  return {
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as TeamRow[]).map(mapTeam),
    players: ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    registrationCodes: [],
    sports: ((sportsResponse.data ?? []) as SportRow[]).map(mapSport),
    competitionFormats: ((formatsResponse.data ?? []) as CompetitionFormatRow[]).map(mapCompetitionFormat),
    venues: ((venuesResponse.data ?? []) as VenueRow[]).map(mapVenue),
    timeSlots: ((slotsResponse.data ?? []) as TimeSlotRow[]).map(mapTimeSlot),
    groups: ((groupsResponse.data ?? []) as GroupRow[]).map(mapGroup),
    groupTeams: ((groupTeamsResponse.data ?? []) as GroupTeamRow[]).map(mapGroupTeam),
    groupStandings: ((groupStandingsResponse.data ?? []) as GroupStandingRow[]).map(mapGroupStanding),
    tournamentBases: ((basesResponse.data ?? []) as TournamentBasesRow[]).map(mapTournamentBases)
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
