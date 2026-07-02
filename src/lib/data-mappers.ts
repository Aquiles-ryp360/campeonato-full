import type {
  Match,
  MatchLiveEvent,
  PaymentMethod,
  PaymentStatus,
  Player,
  PlayerSuspension,
  RefereeAssignment,
  RegistrationCode,
  SportKey,
  Team,
  TournamentFormat,
  TournamentEvent,
  Sport,
  CompetitionFormat,
  TournamentBases,
  Venue,
  TimeSlot,
  Group,
  GroupTeam,
  GroupStanding
} from "./types";

export interface CompetitionData {
  events: TournamentEvent[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  matchLiveEvents?: MatchLiveEvent[];
  registrationCodes: RegistrationCode[];
  sports: Sport[];
  competitionFormats: CompetitionFormat[];
  venues: Venue[];
  timeSlots: TimeSlot[];
  groups: Group[];
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
  tournamentBases: TournamentBases[];
}

export const emptyCompetitionData: CompetitionData = {
  events: [],
  teams: [],
  players: [],
  matches: [],
  matchLiveEvents: [],
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

export function applyCatalogLabels(data: CompetitionData): CompetitionData {
  return {
    ...data,
    events: data.events.map((event) => {
      const sport = data.sports.find((current) => current.id === event.sportId);
      const format = data.competitionFormats.find((current) => current.id === event.formatId);

      return {
        ...event,
        sport: sport ? normalizeSportKey(sport.name) : event.sport,
        format: format ? normalizeFormatKey(format.key) : event.format
      };
    }),
    matches: data.matches.map((match) => {
      const venue = data.venues.find((current) => current.id === match.venueId);
      return {
        ...match,
        court: venue?.name ?? match.court
      };
    })
  };
}

export type SportRow = {
  id: string;
  name: string;
  players_per_team: number;
  match_duration: number;
  active: boolean;
  created_at?: string;
};

export type CompetitionFormatRow = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  active: boolean;
  created_at?: string;
};

export type TournamentBasesRow = {
  id: string;
  championship_name: string;
  year: number;
  organizer: string;
  start_date: string;
  end_date: string;
  description: string;
  match_duration: number;
  points_win: number;
  points_draw: number;
  points_loss: number;
  tiebreaker_rules: string;
  walkover_rules: string;
  max_players_per_team: number;
  sanctions: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type VenueRow = {
  id: string;
  name: string;
  location: string | null;
  active: boolean;
  created_at?: string;
};

export type TimeSlotRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export type GroupRow = {
  id: string;
  event_id: string;
  name: string;
  created_at?: string;
};

export type GroupTeamRow = {
  id: string;
  group_id: string;
  team_id: string;
  created_at?: string;
};

export type GroupStandingRow = {
  id: string;
  group_id: string;
  team_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  updated_at?: string;
};

type NestedRelation<T> = T | T[] | null;

type SportRelation = {
  name: string | null;
};

type FormatRelation = {
  key: string | null;
};

type VenueRelation = {
  name: string | null;
};

export type EventRow = {
  id: string;
  name: string;
  sport_id?: string | null;
  sport?: SportKey | NestedRelation<SportRelation>;
  category: string;
  format_id?: string | null;
  format?: TournamentFormat | NestedRelation<FormatRelation>;
  status: TournamentEvent["status"];
  registration_fee: number | string;
  registration_open_until: string;
  max_teams: number;
  min_players: number;
  max_players: number;
  points_win: number;
  points_draw: number;
  points_loss: number;
  rules_summary: string | null;
  organizer_name?: string | null;
  career_name?: string | null;
  career_logo_url?: string | null;
  payment_qr_yape_url?: string | null;
  payment_qr_plin_url?: string | null;
  payment_contact_phone?: string | null;
  payment_contact_whatsapp_url?: string | null;
  theme_primary_color?: string | null;
  theme_secondary_color?: string | null;
  prevent_cross_sport_conflicts?: boolean | null;
  minimum_rest_minutes?: number | null;
  event_date?: string | null;
  fixture_status?: TournamentEvent["fixtureStatus"] | null;
  seeding_mode?: TournamentEvent["seedingMode"] | null;
  third_place?: boolean | null;
  allow_byes?: boolean | null;
  penalties_enabled?: boolean | null;
  public_live_scores?: boolean | null;
  champion_team_id?: string | null;
  champion_match_id?: string | null;
  champion_decided_at?: string | null;
  fixture_compact_preview?: boolean | null;
  schedule_config?: TournamentEvent["scheduleConfig"] | null;
};

export type RegistrationCodeRow = {
  id: string;
  event_id: string;
  code: string;
  method: PaymentMethod;
  status: RegistrationCode["status"];
  used_by_team_id: string | null;
};

type EmbeddedRegistrationCode =
  | Pick<RegistrationCodeRow, "id" | "code" | "method" | "status">
  | null;

export type TeamRow = {
  id: string;
  event_id: string;
  name: string;
  delegate_name: string;
  delegate_phone: string;
  delegate_email: string | null;
  academic_career?: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: Team["status"];
  admin_observation?: string | null;
  payment_validated_at?: string | null;
  created_at?: string | null;
  registration_code?: EmbeddedRegistrationCode | EmbeddedRegistrationCode[];
};

export type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  dni_masked?: string | null;
  student_code: string;
  codigo_carrera?: string | null;
  escuela?: string | null;
  enrollment_file: string | null;
  semester: string | null;
  lineup_role: Player["lineupRole"] | null;
  document_type?: Player["documentType"] | null;
  identity_source?: Player["identitySource"] | null;
  identity_verified_at?: string | null;
  data_consent_accepted_at?: string | null;
  data_consent_text_version?: string | null;
  registered_by_delegate_id?: string | null;
  verification_status?: Player["verificationStatus"] | null;
  jersey_number?: number | null;
  jersey_number_change_count?: number | null;
  jersey_number_changed_at?: string | null;
  jersey_number_changed_by?: string | null;
  position?: string | null;
  photo_url?: string | null;
};

export type MatchRow = {
  id: string;
  event_id: string;
  round: number;
  stage?: Match["stage"] | null;
  group_id?: string | null;
  bracket_position?: number | null;
  next_match_id?: string | null;
  is_home_next?: boolean | null;
  label?: string | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
  home_source_match_id?: string | null;
  away_source_match_id?: string | null;
  source_match_ids?: string[] | null;
  depends_on_match_ids?: string[] | null;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string;
  scheduled_end_at?: string | null;
  venue_id?: string | null;
  venue?: NestedRelation<VenueRelation>;
  court?: string | null;
  status: Match["status"];
  live_status?: Match["liveStatus"] | null;
  fixture_status?: Match["fixtureStatus"] | null;
  is_fixture_preliminary?: boolean | null;
  home_score: number | null;
  away_score: number | null;
  penalty_home_score?: number | null;
  penalty_away_score?: number | null;
  winner_team_id?: string | null;
  win_method?: Match["winMethod"] | null;
  actual_started_at?: string | null;
  first_half_started_at?: string | null;
  first_half_ended_at?: string | null;
  halftime_started_at?: string | null;
  second_half_started_at?: string | null;
  second_half_ended_at?: string | null;
  actual_finished_at?: string | null;
  submitted_at?: string | null;
  validated_at?: string | null;
  referee_notes?: string | null;
  notes: string | null;
};

export type RefereeAssignmentRow = {
  id: string;
  match_id: string;
  referee_user_id: string | null;
  referee_email: string;
  referee_name: string | null;
  active: boolean;
  assigned_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MatchLiveEventRow = {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  jersey_number: number | null;
  event_type: MatchLiveEvent["eventType"];
  period: MatchLiveEvent["period"];
  minute: number;
  score_home: number | null;
  score_away: number | null;
  penalty_order: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  corrected_at: string | null;
  corrected_by: string | null;
  correction_reason: string | null;
};

export type PlayerSuspensionRow = {
  id: string;
  event_id: string;
  team_id: string;
  player_id: string;
  source_match_id: string | null;
  reason: string;
  matches_remaining: number;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export function mapSport(row: SportRow): Sport {
  return {
    id: row.id,
    name: row.name,
    playersPerTeam: row.players_per_team,
    matchDuration: row.match_duration,
    active: row.active,
    createdAt: row.created_at
  };
}

export function mapCompetitionFormat(row: CompetitionFormatRow): CompetitionFormat {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    description: row.description ?? undefined,
    active: row.active,
    createdAt: row.created_at
  };
}

export function mapTournamentBases(row: TournamentBasesRow): TournamentBases {
  return {
    id: row.id,
    championshipName: row.championship_name,
    year: row.year,
    organizer: row.organizer,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    matchDuration: row.match_duration,
    pointsWin: row.points_win,
    pointsDraw: row.points_draw,
    pointsLoss: row.points_loss,
    tiebreakerRules: row.tiebreaker_rules,
    walkoverRules: row.walkover_rules,
    maxPlayersPerTeam: row.max_players_per_team,
    sanctions: row.sanctions,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? undefined,
    active: row.active,
    createdAt: row.created_at
  };
}

export function mapTimeSlot(row: TimeSlotRow): TimeSlot {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    active: row.active
  };
}

export function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    createdAt: row.created_at
  };
}

export function mapGroupTeam(row: GroupTeamRow): GroupTeam {
  return {
    id: row.id,
    groupId: row.group_id,
    teamId: row.team_id,
    createdAt: row.created_at
  };
}

export function mapGroupStanding(row: GroupStandingRow): GroupStanding {
  return {
    id: row.id,
    groupId: row.group_id,
    teamId: row.team_id,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifference: row.goal_difference,
    points: row.points,
    updatedAt: row.updated_at
  };
}

export function mapEvent(row: EventRow): TournamentEvent {
  const sport = sportKeyFromValue(row.sport) ?? sportKeyFromId(row.sport_id);
  const format = formatKeyFromValue(row.format) ?? formatKeyFromId(row.format_id);

  return {
    id: row.id,
    name: row.name,
    sportId: row.sport_id ?? sportIdFromKey(sport),
    sport,
    category: row.category,
    formatId: row.format_id ?? formatIdFromKey(format),
    format,
    status: row.status,
    registrationFee: Number(row.registration_fee),
    registrationOpenUntil: row.registration_open_until,
    maxTeams: row.max_teams,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    pointsWin: row.points_win,
    pointsDraw: row.points_draw,
    pointsLoss: row.points_loss,
    rulesSummary: row.rules_summary ?? "",
    organizerName: row.organizer_name ?? undefined,
    careerName: row.career_name ?? undefined,
    careerLogoUrl: row.career_logo_url ?? undefined,
    paymentQrYapeUrl: row.payment_qr_yape_url ?? undefined,
    paymentQrPlinUrl: row.payment_qr_plin_url ?? undefined,
    paymentContactPhone: row.payment_contact_phone ?? undefined,
    paymentContactWhatsappUrl: row.payment_contact_whatsapp_url ?? undefined,
    themePrimaryColor: row.theme_primary_color ?? undefined,
    themeSecondaryColor: row.theme_secondary_color ?? undefined,
    preventCrossSportConflicts: row.prevent_cross_sport_conflicts ?? false,
    minimumRestMinutes: row.minimum_rest_minutes ?? 60,
    eventDate: row.event_date ?? undefined,
    fixtureStatus: row.fixture_status ?? undefined,
    seedingMode: row.seeding_mode ?? undefined,
    thirdPlace: row.third_place ?? undefined,
    allowByes: row.allow_byes ?? undefined,
    penaltiesEnabled: row.penalties_enabled ?? undefined,
    publicLiveScores: row.public_live_scores ?? undefined,
    championTeamId: row.champion_team_id ?? undefined,
    championMatchId: row.champion_match_id ?? undefined,
    championDecidedAt: row.champion_decided_at ?? undefined,
    fixtureCompactPreview: row.fixture_compact_preview ?? undefined,
    scheduleConfig: row.schedule_config ?? undefined
  };
}

export function mapRegistrationCode(row: RegistrationCodeRow): RegistrationCode {
  return {
    id: row.id,
    eventId: row.event_id,
    code: row.code,
    paymentMethod: row.method,
    status: row.status,
    usedByTeamId: row.used_by_team_id ?? undefined
  };
}

export function mapTeam(row: TeamRow): Team {
  const embeddedCode = firstNested(row.registration_code);
  const colors = defaultTeamColors(row.id);

  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    delegateName: row.delegate_name,
    delegatePhone: row.delegate_phone,
    delegateEmail: row.delegate_email ?? "",
    academicCareer: row.academic_career ?? undefined,
    paymentMethod: embeddedCode?.method ?? "yape",
    registrationCode: embeddedCode?.code ?? "Codigo no visible",
    paymentStatus: paymentStatusFromTeam(row.payment_validated_at, embeddedCode?.status),
    status: row.status,
    adminObservation: row.admin_observation ?? undefined,
    paymentValidatedAt: row.payment_validated_at ?? undefined,
    primaryColor: row.primary_color ?? colors.primary,
    secondaryColor: row.secondary_color ?? colors.secondary,
    createdAt: row.created_at ?? undefined
  };
}

export function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    dniMasked: row.dni_masked ?? undefined,
    studentCode: row.student_code,
    codigoCarrera: row.codigo_carrera ?? undefined,
    escuela: row.escuela ?? undefined,
    enrollmentFile: row.enrollment_file ?? "",
    semester: row.semester ?? "",
    lineupRole: row.lineup_role ?? "starter",
    documentType: row.document_type ?? undefined,
    identitySource: row.identity_source ?? undefined,
    identityVerifiedAt: row.identity_verified_at ?? undefined,
    dataConsentAcceptedAt: row.data_consent_accepted_at ?? undefined,
    dataConsentTextVersion: row.data_consent_text_version ?? undefined,
    registeredByDelegateId: row.registered_by_delegate_id ?? undefined,
    verificationStatus: row.verification_status ?? undefined,
    jerseyNumber: row.jersey_number ?? undefined,
    jerseyNumberChangeCount: row.jersey_number_change_count ?? undefined,
    jerseyNumberChangedAt: row.jersey_number_changed_at ?? undefined,
    jerseyNumberChangedBy: row.jersey_number_changed_by ?? undefined,
    position: row.position ?? undefined,
    photoUrl: row.photo_url ?? undefined
  };
}

export function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    eventId: row.event_id,
    round: row.round,
    stage: row.stage ?? "group_stage",
    groupId: row.group_id ?? undefined,
    bracketPosition: row.bracket_position ?? undefined,
    nextMatchId: row.next_match_id ?? undefined,
    isHomeNext: row.is_home_next ?? undefined,
    label: row.label ?? undefined,
    homePlaceholder: row.home_placeholder ?? undefined,
    awayPlaceholder: row.away_placeholder ?? undefined,
    homeSourceMatchId: row.home_source_match_id ?? undefined,
    awaySourceMatchId: row.away_source_match_id ?? undefined,
    sourceMatchIds: row.source_match_ids ?? undefined,
    dependsOnMatchIds: row.depends_on_match_ids ?? undefined,
    homeTeamId: row.home_team_id ?? "",
    awayTeamId: row.away_team_id ?? "",
    scheduledAt: row.scheduled_at,
    scheduledEndAt: row.scheduled_end_at ?? undefined,
    venueId: row.venue_id ?? undefined,
    court: venueNameFromValue(row.venue) ?? row.court ?? "Cancha por definir",
    status: row.status,
    liveStatus: row.live_status ?? undefined,
    fixtureStatus: row.fixture_status ?? undefined,
    isFixturePreliminary: row.is_fixture_preliminary ?? undefined,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    penaltyHomeScore: row.penalty_home_score ?? undefined,
    penaltyAwayScore: row.penalty_away_score ?? undefined,
    winnerTeamId: row.winner_team_id ?? undefined,
    winMethod: row.win_method ?? undefined,
    actualStartedAt: row.actual_started_at ?? undefined,
    firstHalfStartedAt: row.first_half_started_at ?? undefined,
    firstHalfEndedAt: row.first_half_ended_at ?? undefined,
    halftimeStartedAt: row.halftime_started_at ?? undefined,
    secondHalfStartedAt: row.second_half_started_at ?? undefined,
    secondHalfEndedAt: row.second_half_ended_at ?? undefined,
    actualFinishedAt: row.actual_finished_at ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    validatedAt: row.validated_at ?? undefined,
    refereeNotes: row.referee_notes ?? undefined,
    notes: row.notes ?? undefined
  };
}

export function mapRefereeAssignment(row: RefereeAssignmentRow): RefereeAssignment {
  return {
    id: row.id,
    matchId: row.match_id,
    refereeUserId: row.referee_user_id ?? undefined,
    refereeEmail: row.referee_email,
    refereeName: row.referee_name ?? undefined,
    active: row.active,
    assignedBy: row.assigned_by ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

export function mapMatchLiveEvent(row: MatchLiveEventRow): MatchLiveEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id ?? undefined,
    playerId: row.player_id ?? undefined,
    jerseyNumber: row.jersey_number ?? undefined,
    eventType: row.event_type,
    period: row.period,
    minute: row.minute,
    scoreHome: row.score_home ?? undefined,
    scoreAway: row.score_away ?? undefined,
    penaltyOrder: row.penalty_order ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    correctedAt: row.corrected_at ?? undefined,
    correctedBy: row.corrected_by ?? undefined,
    correctionReason: row.correction_reason ?? undefined
  };
}

export function mapPlayerSuspension(row: PlayerSuspensionRow): PlayerSuspension {
  return {
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    playerId: row.player_id,
    sourceMatchId: row.source_match_id ?? undefined,
    reason: row.reason,
    matchesRemaining: row.matches_remaining,
    active: row.active,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

function sportKeyFromValue(value: EventRow["sport"]): SportKey | null {
  const current = firstNested(value);
  if (!current) return null;

  if (typeof current === "string") return normalizeSportKey(current);
  return normalizeSportKey(current.name);
}

function sportKeyFromId(value?: string | null): SportKey {
  return normalizeSportKey(value);
}

function normalizeSportKey(value?: string | null): SportKey {
  const normalized = normalizeText(value);
  if (normalized.includes("voley") || normalized.includes("volley")) return "voley";
  if (normalized.includes("futbol")) return "futbol";
  return "futsal";
}

function sportIdFromKey(value: SportKey) {
  if (value === "voley") return "sport-voley";
  if (value === "futbol") return "sport-futbol";
  return "sport-futsal";
}

function formatKeyFromValue(value: EventRow["format"]): TournamentFormat | null {
  const current = firstNested(value);
  if (!current) return null;

  if (typeof current === "string") return normalizeFormatKey(current);
  return normalizeFormatKey(current.key);
}

function formatKeyFromId(value?: string | null): TournamentFormat {
  return normalizeFormatKey(value);
}

function normalizeFormatKey(value?: string | null): TournamentFormat {
  const normalized = normalizeText(value);
  if (normalized.includes("single") || normalized.includes("knockout")) {
    return "single_elimination";
  }
  if (normalized.includes("group") || normalized.includes("grupo")) {
    return "groups_then_knockout";
  }
  return "league";
}

function formatIdFromKey(value: TournamentFormat) {
  if (value === "single_elimination") return "format-knockout";
  if (value === "groups_then_knockout") return "format-groups";
  return "format-league";
}

function venueNameFromValue(value: MatchRow["venue"]) {
  const current = firstNested(value);
  return current?.name ?? null;
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstNested<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function paymentStatusFromTeam(
  paymentValidatedAt?: string | null,
  status?: RegistrationCode["status"]
): PaymentStatus {
  if (paymentValidatedAt) return "verified";
  if (status === "revoked") return "rejected";
  return "pending";
}

function defaultTeamColors(id: string) {
  const palettes = [
    { primary: "#2563eb", secondary: "#f8fafc" },
    { primary: "#dc2626", secondary: "#111827" },
    { primary: "#16a34a", secondary: "#facc15" },
    { primary: "#0891b2", secondary: "#ecfeff" },
    { primary: "#7c3aed", secondary: "#f5f3ff" },
    { primary: "#ea580c", secondary: "#fff7ed" }
  ];
  const index = [...id].reduce((total, char) => total + char.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}
