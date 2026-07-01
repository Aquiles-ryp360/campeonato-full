import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  applyCatalogLabels,
  mapCategory,
  mapEvent,
  mapMatch,
  mapPlayer,
  mapRegistrationCode,
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
  type RegistrationCodeRow,
  type TeamRow,
  type SportRow,
  type CompetitionFormatRow,
  type CategoryRow,
  type VenueRow,
  type TimeSlotRow,
  type GroupRow,
  type GroupTeamRow,
  type GroupStandingRow,
  type TournamentBasesRow
} from "./data-mappers";
import { mockCompetitionData } from "./mock-data";

const legacyEventColumns = `
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
  category_id,
  name,
  delegate_name,
  delegate_phone,
  delegate_email,
  academic_career,
  primary_color,
  secondary_color,
  status,
  payment_status,
  created_at
`;

const legacyPublicTeamColumns = `
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

const registrationCodeColumns = `
  id,
  event_id,
  code,
  method,
  status,
  used_by_team_id
`;

const privatePlayerColumns = `
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

const publicPlayerColumns = `
  id,
  team_id,
  first_name,
  last_name,
  student_code,
  semester,
  lineup_role,
  photo_url
`;

const legacyMatchColumns = `
  id,
  event_id,
  round,
  home_team_id,
  away_team_id,
  scheduled_at,
  court,
  status,
  home_score,
  away_score,
  notes
`;

type CompetitionDataOptions = {
  includePrivatePlayerFields?: boolean;
};

type PublicPlayerRow = Omit<PlayerRow, "dni" | "enrollment_file"> &
  Partial<Pick<PlayerRow, "dni" | "enrollment_file">>;

export async function getPublicCompetitionData({
  includePrivatePlayerFields = false
}: CompetitionDataOptions = {}): Promise<CompetitionData> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return filterPrivatePlayerFields(mockCompetitionData, includePrivatePlayerFields);

  const playerSelect = includePrivatePlayerFields ? privatePlayerColumns : publicPlayerColumns;

  const [
    eventsResponse,
    teamsResponse,
    playersResponse,
    matchesResponse,
    codesResponse,
    categoriesResponse,
    sportsResponse,
    formatsResponse,
    venuesResponse,
    slotsResponse,
    groupsResponse,
    groupTeamsResponse,
    groupStandingsResponse,
    basesResponse
  ] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: true }),
    supabase.from("teams").select(publicTeamColumns).order("created_at", { ascending: true }),
    supabase.from("players").select(playerSelect).order("created_at", { ascending: true }),
    supabase.from("matches").select("*").order("scheduled_at", { ascending: true }),
    includePrivatePlayerFields
      ? supabase.from("registration_codes").select(registrationCodeColumns).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("event_categories").select("*").order("sort_order", { ascending: true }),
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
  logSupabaseError("registration_codes", codesResponse.error);
  logSupabaseError("categories", categoriesResponse.error);
  logSupabaseError("sports", sportsResponse.error);
  logSupabaseError("competition_formats", formatsResponse.error);
  logSupabaseError("venues", venuesResponse.error);
  logSupabaseError("time_slots", slotsResponse.error);
  logSupabaseError("groups", groupsResponse.error);
  logSupabaseError("group_teams", groupTeamsResponse.error);
  logSupabaseError("group_standings", groupStandingsResponse.error);
  logSupabaseError("tournament_bases", basesResponse.error);

  if (
    hasAnyError([
      eventsResponse.error,
      teamsResponse.error,
      matchesResponse.error,
      codesResponse.error,
      categoriesResponse.error,
      sportsResponse.error,
      formatsResponse.error,
      venuesResponse.error,
      slotsResponse.error,
      groupsResponse.error,
      groupTeamsResponse.error,
      groupStandingsResponse.error,
      basesResponse.error
    ])
  ) {
    return getLegacyPublicCompetitionData(supabase, includePrivatePlayerFields);
  }

  return applyCatalogLabels({
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as TeamRow[]).map(mapTeam),
    players: mapPlayerRows((playersResponse.data ?? []) as unknown as PublicPlayerRow[], includePrivatePlayerFields),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    categories: ((categoriesResponse.data ?? []) as CategoryRow[]).map(mapCategory),
    registrationCodes: ((codesResponse.data ?? []) as RegistrationCodeRow[]).map(mapRegistrationCode),
    sports: ((sportsResponse.data ?? []) as SportRow[]).map(mapSport),
    competitionFormats: ((formatsResponse.data ?? []) as CompetitionFormatRow[]).map(mapCompetitionFormat),
    venues: ((venuesResponse.data ?? []) as VenueRow[]).map(mapVenue),
    timeSlots: ((slotsResponse.data ?? []) as TimeSlotRow[]).map(mapTimeSlot),
    groups: ((groupsResponse.data ?? []) as GroupRow[]).map(mapGroup),
    groupTeams: ((groupTeamsResponse.data ?? []) as GroupTeamRow[]).map(mapGroupTeam),
    groupStandings: ((groupStandingsResponse.data ?? []) as GroupStandingRow[]).map(mapGroupStanding),
    tournamentBases: ((basesResponse.data ?? []) as TournamentBasesRow[]).map(mapTournamentBases)
  });
}

async function getLegacyPublicCompetitionData(
  supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>,
  includePrivatePlayerFields: boolean
): Promise<CompetitionData> {
  const playerSelect = includePrivatePlayerFields ? privatePlayerColumns : publicPlayerColumns;
  const [eventsResponse, teamsResponse, playersResponse, matchesResponse] = await Promise.all([
    supabase.from("events").select(legacyEventColumns).order("created_at", { ascending: true }),
    supabase.from("teams").select(legacyPublicTeamColumns).order("created_at", { ascending: true }),
    supabase.from("players").select(playerSelect).order("created_at", { ascending: true }),
    supabase.from("matches").select(legacyMatchColumns).order("scheduled_at", { ascending: true })
  ]);

  logSupabaseError("legacy events", eventsResponse.error);
  logSupabaseError("legacy teams", teamsResponse.error);
  logSupabaseError("legacy players", playersResponse.error);
  logSupabaseError("legacy matches", matchesResponse.error);

  const categories = buildLegacyCategories((eventsResponse.data ?? []) as EventRow[]);
  const categoryByEventId = new Map(categories.map((category) => [category.eventId, category.id]));

  return {
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as TeamRow[]).map((row) => ({
      ...mapTeam(row),
      categoryId: categoryByEventId.get(row.event_id)
    })),
    players: mapPlayerRows((playersResponse.data ?? []) as unknown as PublicPlayerRow[], includePrivatePlayerFields),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map((row) => ({
      ...mapMatch(row),
      categoryId: categoryByEventId.get(row.event_id)
    })),
    categories,
    registrationCodes: [],
    sports: [],
    competitionFormats: [],
    venues: [],
    timeSlots: [],
    groups: [],
    groupTeams: [],
    groupStandings: [],
    tournamentBases: []
  };
}

function mapPlayerRows(rows: PublicPlayerRow[], includePrivatePlayerFields: boolean) {
  return rows.map((row) =>
    mapPlayer({
      ...row,
      dni: includePrivatePlayerFields ? row.dni ?? "" : "",
      enrollment_file: includePrivatePlayerFields ? row.enrollment_file ?? "" : ""
    })
  );
}

function filterPrivatePlayerFields(data: CompetitionData, includePrivatePlayerFields: boolean): CompetitionData {
  if (includePrivatePlayerFields) return data;

  return {
    ...data,
    players: data.players.map((player) => ({
      ...player,
      dni: "",
      enrollmentFile: ""
    }))
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

function hasAnyError(errors: Array<{ message?: string } | null>) {
  return errors.some(Boolean);
}

function logSupabaseError(label: string, error: { message?: string } | null) {
  if (!error) return;
  console.error(`Supabase ${label} query failed: ${error.message ?? "unknown error"}`);
}

function buildLegacyCategories(events: EventRow[]) {
  return events.map((event, index) => ({
    id: `legacy-category-${event.id}`,
    eventId: event.id,
    name: event.category || "General",
    slug: slugifyText(event.category || `categoria-${index + 1}`),
    description: undefined,
    published: true,
    active: true,
    sortOrder: 1,
    createdAt: undefined,
    updatedAt: undefined
  }));
}

function slugifyText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
