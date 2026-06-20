import type {
  Match,
  PaymentMethod,
  PaymentStatus,
  Player,
  RegistrationCode,
  Team,
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

export type EventRow = {
  id: string;
  name: string;
  sport_id: string;
  category: string;
  format_id: string;
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
  prevent_cross_sport_conflicts: boolean;
  minimum_rest_minutes: number;
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
  academic_career: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: Team["status"];
  created_at?: string | null;
  registration_code?: EmbeddedRegistrationCode | EmbeddedRegistrationCode[];
};

export type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  student_code: string;
  enrollment_file: string | null;
  semester: string | null;
  lineup_role: Player["lineupRole"] | null;
  photo_url?: string | null;
};

export type MatchRow = {
  id: string;
  event_id: string;
  round: number;
  stage: Match["stage"];
  group_id: string | null;
  bracket_position: number | null;
  next_match_id: string | null;
  is_home_next: boolean | null;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  venue_id: string | null;
  status: Match["status"];
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
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
  return {
    id: row.id,
    name: row.name,
    sportId: row.sport_id,
    category: row.category,
    formatId: row.format_id,
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
    preventCrossSportConflicts: row.prevent_cross_sport_conflicts,
    minimumRestMinutes: row.minimum_rest_minutes
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
    paymentStatus: paymentStatusFromCode(embeddedCode?.status),
    status: row.status,
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
    studentCode: row.student_code,
    enrollmentFile: row.enrollment_file ?? "",
    semester: row.semester ?? "",
    lineupRole: row.lineup_role ?? "starter",
    photoUrl: row.photo_url ?? undefined
  };
}

export function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    eventId: row.event_id,
    round: row.round,
    stage: row.stage,
    groupId: row.group_id ?? undefined,
    bracketPosition: row.bracket_position ?? undefined,
    nextMatchId: row.next_match_id ?? undefined,
    isHomeNext: row.is_home_next ?? undefined,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    scheduledAt: row.scheduled_at,
    venueId: row.venue_id ?? undefined,
    status: row.status,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    notes: row.notes ?? undefined
  };
}

function firstNested<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function paymentStatusFromCode(status?: RegistrationCode["status"]): PaymentStatus {
  if (status === "used") return "verified";
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
