export type Sport = "futsal" | "voley";

export type TournamentFormat =
  | "league"
  | "single_elimination"
  | "groups_then_knockout";

export type EventStatus = "draft" | "registration" | "in_progress" | "finished";

export type PaymentMethod = "yape" | "plin";

export type PaymentStatus = "pending" | "verified" | "rejected";

export type TeamStatus = "pending_payment" | "registered" | "observed" | "approved";

export type MatchStatus = "scheduled" | "finished" | "walkover" | "postponed";

export type PlayerRole = "starter" | "substitute";

export interface TournamentEvent {
  id: string;
  name: string;
  sport: Sport;
  category: string;
  format: TournamentFormat;
  status: EventStatus;
  registrationFee: number;
  registrationOpenUntil: string;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  rulesSummary: string;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  paymentMethod: PaymentMethod;
  registrationCode: string;
  paymentStatus: PaymentStatus;
  status: TeamStatus;
  primaryColor: string;
  secondaryColor: string;
}

export interface RegistrationCode {
  id: string;
  eventId: string;
  code: string;
  paymentMethod: PaymentMethod;
  status: "available" | "used" | "revoked";
  usedByTeamId?: string;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  enrollmentFile: string;
  semester: string;
  lineupRole: PlayerRole;
  photoUrl?: string;
}

export interface Match {
  id: string;
  eventId: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  court: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  homeFouls?: number;
  awayFouls?: number;
  notes?: string;
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ParsedAudioResult {
  eventId: string;
  matchId: string;
  confidence: number;
  rawTranscript: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  goals: Array<{
    teamName: string;
    playerName?: string;
    minute?: number;
  }>;
  cards: Array<{
    teamName?: string;
    playerName?: string;
    type: "yellow" | "red";
    minute?: number;
  }>;
  notes: string;
}

export interface RegistrationDraft {
  eventId: string;
  teamName: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  paymentMethod: PaymentMethod;
  registrationCode: string;
}
