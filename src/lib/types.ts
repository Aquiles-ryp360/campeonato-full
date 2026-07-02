export type SportKey = "futsal" | "voley" | "futbol";

export type TournamentFormat =
  | "league"
  | "single_elimination"
  | "groups_then_knockout";

export type EventStatus = "draft" | "registration" | "in_progress" | "finished";

export type PaymentMethod = "yape" | "plin";

export type PaymentStatus = "pending" | "verified" | "rejected";

export type TeamStatus = "pending_payment" | "registered" | "observed" | "approved" | "rejected";

export type MatchStatus = "scheduled" | "finished" | "walkover" | "postponed";

export type MatchWinMethod = "regulation" | "penalties" | "walkover";

export type LiveMatchStatus =
  | "scheduled"
  | "in_progress_first_half"
  | "halftime"
  | "in_progress_second_half"
  | "pending_tiebreak"
  | "penalties"
  | "referee_submitted"
  | "submitted"
  | "validated"
  | "under_review"
  | "corrected"
  | "disputed"
  | "cancelled";

export type MatchLiveEventType =
  | "match_started"
  | "first_half_finished"
  | "second_half_started"
  | "match_finished"
  | "result_submitted"
  | "penalties_started"
  | "penalties_finished"
  | "bracket_updated"
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "penalty_missed"
  | "yellow_card"
  | "red_card"
  | "foul"
  | "injury"
  | "observation"
  | "penalty_scored"
  | "penalty_missed_tiebreak";

export type MatchPeriod =
  | "pre_match"
  | "first_half"
  | "halftime"
  | "second_half"
  | "penalties"
  | "post_match";

export type PlayerRole = "starter" | "substitute";

export type DocumentType = "DNI" | "UNAP_CODE" | "MANUAL";

export type IdentitySource =
  | "manual"
  | "unap_tramites"
  | "dni_provider"
  | "unap_docentes"
  | "peruapi";

export type VerificationStatus = "unverified" | "auto_filled" | "confirmed" | "manual_review";

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

export interface ChampionshipBranding {
  organizerName?: string;
  careerName?: string;
  careerLogoUrl?: string;
  paymentQrYapeUrl?: string;
  paymentQrPlinUrl?: string;
  paymentContactPhone?: string;
  paymentContactWhatsappUrl?: string;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
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
  organizerName?: string;
  careerName?: string;
  careerLogoUrl?: string;
  paymentQrYapeUrl?: string;
  paymentQrPlinUrl?: string;
  paymentContactPhone?: string;
  paymentContactWhatsappUrl?: string;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  preventCrossSportConflicts: boolean;
  minimumRestMinutes: number;
  eventDate?: string;
  fixtureStatus?: FixtureStatus;
  seedingMode?: SeedingMode;
  thirdPlace?: boolean;
  allowByes?: boolean;
  penaltiesEnabled?: boolean;
  publicLiveScores?: boolean;
  championTeamId?: string;
  championMatchId?: string;
  championDecidedAt?: string;
  fixtureCompactPreview?: boolean;
  scheduleConfig?: {
    startTime: string;
    matchDurationMinutes: number;
    halfTimeMinute?: number;
    halfTimeBreakMinutes?: number;
    additionalTimeAllowedMinutes?: number;
    matchStartToleranceMinutes?: number;
    allowManualFinish?: boolean;
    transitionMinutes: number;
    courts: string[];
    courtCount?: number;
    minimumRestMinutes: number;
    allowCompactPreview: boolean;
    estimatedEndTime?: string;
    branding?: ChampionshipBranding;
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
  adminObservation?: string;
  paymentValidatedAt?: string;
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
  dniMasked?: string;
  studentCode: string;
  codigoCarrera?: string;
  escuela?: string;
  enrollmentFile: string;
  semester: string;
  lineupRole: PlayerRole;
  documentType?: DocumentType;
  identitySource?: IdentitySource;
  identityVerifiedAt?: string;
  dataConsentAcceptedAt?: string;
  dataConsentTextVersion?: string;
  registeredByDelegateId?: string;
  verificationStatus?: VerificationStatus;
  jerseyNumber?: number;
  jerseyNumberChangeCount?: number;
  jerseyNumberChangedAt?: string;
  jerseyNumberChangedBy?: string;
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
  liveStatus?: LiveMatchStatus;
  fixtureStatus?: FixtureStatus;
  isFixturePreliminary?: boolean;
  homeScore?: number;
  awayScore?: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winnerTeamId?: string;
  winMethod?: MatchWinMethod;
  actualStartedAt?: string;
  firstHalfStartedAt?: string;
  firstHalfEndedAt?: string;
  halftimeStartedAt?: string;
  secondHalfStartedAt?: string;
  secondHalfEndedAt?: string;
  actualFinishedAt?: string;
  submittedAt?: string;
  validatedAt?: string;
  refereeNotes?: string;
  homeFouls?: number;
  awayFouls?: number;
  notes?: string;
}

export interface RefereeAssignment {
  id: string;
  matchId: string;
  refereeUserId?: string;
  refereeEmail: string;
  refereeName?: string;
  active: boolean;
  assignedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchLiveEvent {
  id: string;
  matchId: string;
  teamId?: string;
  playerId?: string;
  jerseyNumber?: number;
  eventType: MatchLiveEventType;
  period: MatchPeriod;
  minute: number;
  scoreHome?: number;
  scoreAway?: number;
  penaltyOrder?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  correctedAt?: string;
  correctedBy?: string;
  correctionReason?: string;
}

export interface PlayerSuspension {
  id: string;
  eventId: string;
  teamId: string;
  playerId: string;
  sourceMatchId?: string;
  reason: string;
  matchesRemaining: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
