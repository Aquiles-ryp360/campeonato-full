export type SportKey = "futsal" | "voley" | "futbol";

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

export type FixtureStatus = "draft_auto" | "draft_review" | "published" | "locked";

export type SeedingMode = "random" | "registration_order" | "manual" | "ranking";

export type MatchStage =
  | "group_stage"
  | "preliminary"
  | "round_of_16"
  | "quarter_finals"
  | "semi_finals"
  | "final"
  | "third_place";

export interface Sport {
  id: string;
  name: string;
  playersPerTeam: number;
  matchDuration: number;
  active: boolean;
  createdAt?: string;
}

export interface CompetitionFormat {
  id: string;
  name: string;
  key: string;
  description?: string;
  active: boolean;
  createdAt?: string;
}

export interface TournamentBases {
  id: string;
  championshipName: string;
  year: number;
  organizer: string;
  startDate: string;
  endDate: string;
  description: string;
  matchDuration: number;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakerRules: string;
  walkoverRules: string;
  maxPlayersPerTeam: number;
  sanctions: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentEvent {
  id: string;
  name: string;
  sportId: string;
  sport: SportKey;
  category: string;
  formatId: string;
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
  preventCrossSportConflicts: boolean;
  minimumRestMinutes: number;
  eventDate?: string;
  fixtureStatus?: FixtureStatus;
  seedingMode?: SeedingMode;
  thirdPlace?: boolean;
  allowByes?: boolean;
  penaltiesEnabled?: boolean;
  fixtureCompactPreview?: boolean;
  scheduleConfig?: {
    startTime: string;
    matchDurationMinutes: number;
    transitionMinutes: number;
    courts: string[];
    courtCount?: number;
    minimumRestMinutes: number;
    allowCompactPreview: boolean;
    estimatedEndTime?: string;
  };
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  academicCareer?: string;
  paymentMethod: PaymentMethod;
  registrationCode: string;
  paymentStatus: PaymentStatus;
  status: TeamStatus;
  primaryColor: string;
  secondaryColor: string;
  createdAt?: string;
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
  jerseyNumber?: number;
  position?: string;
  photoUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
  location?: string;
  active: boolean;
  createdAt?: string;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0: Domingo, 1: Lunes, etc.
  startTime: string; // "HH:MM:SS" o "HH:MM"
  endTime: string;
  active: boolean;
}

export interface Group {
  id: string;
  eventId: string;
  name: string;
  createdAt?: string;
}

export interface GroupTeam {
  id: string;
  groupId: string;
  teamId: string;
  createdAt?: string;
}

export interface GroupStanding {
  id: string;
  groupId: string;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  updatedAt?: string;
}

export interface Match {
  id: string;
  eventId: string;
  round: number;
  stage: MatchStage;
  groupId?: string;
  bracketPosition?: number;
  nextMatchId?: string;
  isHomeNext?: boolean;
  label?: string;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeSourceMatchId?: string;
  awaySourceMatchId?: string;
  sourceMatchIds?: string[];
  dependsOnMatchIds?: string[];
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  venueId?: string;
  court: string;
  status: MatchStatus;
  fixtureStatus?: FixtureStatus;
  isFixturePreliminary?: boolean;
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
