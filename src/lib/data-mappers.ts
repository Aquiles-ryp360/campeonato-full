import type {
  Match,
  PaymentMethod,
  PaymentStatus,
  Player,
  RegistrationCode,
  Team,
  TournamentEvent
} from "./types";

export interface CompetitionData {
  events: TournamentEvent[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  registrationCodes: RegistrationCode[];
}

export const emptyCompetitionData: CompetitionData = {
  events: [],
  teams: [],
  players: [],
  matches: [],
  registrationCodes: []
};

export type EventRow = {
  id: string;
  name: string;
  sport: TournamentEvent["sport"];
  category: string;
  format: TournamentEvent["format"];
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
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  status: Match["status"];
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
};

export function mapEvent(row: EventRow): TournamentEvent {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    category: row.category,
    format: row.format,
    status: row.status,
    registrationFee: Number(row.registration_fee),
    registrationOpenUntil: row.registration_open_until,
    maxTeams: row.max_teams,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    pointsWin: row.points_win,
    pointsDraw: row.points_draw,
    pointsLoss: row.points_loss,
    rulesSummary: row.rules_summary ?? ""
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
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    scheduledAt: row.scheduled_at,
    court: "Cancha por definir",
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
