"use client";

import {
  applyCatalogLabels,
  mapEvent,
  mapMatch,
  mapPlayer,
  mapCategory,
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
  type CategoryRow,
  type RegistrationCodeRow,
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
import { mockCompetitionData } from "./mock-data";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "./supabase";

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

const teamColumns = `
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
  created_at
`;

const legacyTeamColumns = `
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

const legacyTeamColumnsWithCode = `
  ${legacyTeamColumns},
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
  if (!hasSupabaseEnv()) return mockCompetitionData;

  const supabase = createSupabaseBrowserClient();
  const teamSelect = includeRegistrationCodes ? teamColumnsWithCode : teamColumns;

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
    supabase.from("teams").select(teamSelect).order("created_at", { ascending: true }),
    supabase.from("players").select(playerColumns).order("created_at", { ascending: true }),
    supabase.from("matches").select("*").order("scheduled_at", { ascending: true }),
    includeRegistrationCodes
      ? supabase
          .from("registration_codes")
          .select(registrationCodeColumns)
          .order("created_at", { ascending: true })
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

  if (
    hasAnyError([
      eventsResponse.error,
      teamsResponse.error,
      matchesResponse.error,
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
    return fetchLegacyBrowserCompetitionData(supabase, includeRegistrationCodes);
  }

  if (eventsResponse.error) throw new Error("No se pudieron cargar los eventos.");
  if (teamsResponse.error) throw new Error("No se pudieron cargar los equipos.");
  if (playersResponse.error) throw new Error("No se pudieron cargar los jugadores.");
  if (matchesResponse.error) throw new Error("No se pudieron cargar los partidos.");
  if (codesResponse.error) throw new Error("No se pudieron cargar los codigos.");
  if (categoriesResponse.error) throw new Error("No se pudieron cargar las categorias.");
  if (sportsResponse.error) throw new Error("No se pudieron cargar los deportes.");
  if (formatsResponse.error) throw new Error("No se pudieron cargar los formatos.");
  if (venuesResponse.error) throw new Error("No se pudieron cargar las canchas.");
  if (slotsResponse.error) throw new Error("No se pudieron cargar los horarios.");
  if (groupsResponse.error) throw new Error("No se pudieron cargar los grupos.");
  if (groupTeamsResponse.error) throw new Error("No se pudieron cargar los equipos de los grupos.");
  if (groupStandingsResponse.error) throw new Error("No se pudieron cargar la tabla de posiciones por grupo.");
  if (basesResponse.error) throw new Error("No se pudieron cargar las bases del torneo.");

  return applyCatalogLabels({
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as unknown as TeamRow[]).map(mapTeam),
    players: ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    registrationCodes: ((codesResponse.data ?? []) as RegistrationCodeRow[]).map(mapRegistrationCode),
    categories:
      ((categoriesResponse.data ?? []) as CategoryRow[]).length > 0
        ? ((categoriesResponse.data ?? []) as CategoryRow[]).map(mapCategory)
        : buildLegacyCategories((eventsResponse.data ?? []) as EventRow[]),
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

async function fetchLegacyBrowserCompetitionData(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  includeRegistrationCodes: boolean
): Promise<CompetitionData> {
  const teamSelect = includeRegistrationCodes ? legacyTeamColumnsWithCode : legacyTeamColumns;
  const [eventsResponse, teamsResponse, playersResponse, matchesResponse, codesResponse] =
    await Promise.all([
      supabase.from("events").select(legacyEventColumns).order("created_at", { ascending: true }),
      supabase.from("teams").select(teamSelect).order("created_at", { ascending: true }),
      supabase.from("players").select(playerColumns).order("created_at", { ascending: true }),
      supabase.from("matches").select(legacyMatchColumns).order("scheduled_at", { ascending: true }),
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

  const categories = buildLegacyCategories((eventsResponse.data ?? []) as EventRow[]);
  const categoryByEventId = new Map(categories.map((category) => [category.eventId, category.id]));

  return {
    events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
    teams: ((teamsResponse.data ?? []) as unknown as TeamRow[]).map((row) => ({
      ...mapTeam(row),
      categoryId: categoryByEventId.get(row.event_id)
    })),
    players: ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map((row) => ({
      ...mapMatch(row),
      categoryId: categoryByEventId.get(row.event_id)
    })),
    registrationCodes: ((codesResponse.data ?? []) as RegistrationCodeRow[]).map(
      mapRegistrationCode
    ),
    categories,
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

function hasAnyError(errors: Array<{ message?: string } | null>) {
  return errors.some(Boolean);
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
