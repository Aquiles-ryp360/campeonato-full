import assert from "node:assert/strict";
import test from "node:test";
import {
  canFinalizePenaltyShootout,
  formatMatchScore,
  getPenaltyStartEligibility,
  isPublicLiveMatch,
  liveStatusLabel,
  penaltyAttemptTone,
  shouldAdvanceOfficialWinner,
  splitPublicLiveMatches,
  summarizePenaltyShootout
} from "../src/lib/live-match";
import {
  canChangeJerseyNumberAfterStart,
  canDelegateEditBeforeStart,
  delegatePlayerAddObservation,
  delegateTeamUpdateObservation,
  findCrossTeamDuplicate,
  findDuplicateNormalizedValue,
  registrationAvailability,
  validateEnrollmentFileMeta,
  validateJerseyNumber,
  validateTeamApproval
} from "../src/lib/domain/registration-rules";
import { calculateStandings } from "../src/lib/utils";
import type { Match, MatchLiveEvent, Player, Team, TournamentEvent } from "../src/lib/types";

const match: Match = {
  id: "match-1",
  eventId: "event-1",
  round: 1,
  stage: "final",
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  scheduledAt: "2026-07-01T20:00:00.000Z",
  court: "Cancha 1",
  status: "scheduled",
  liveStatus: "penalties",
  homeScore: 1,
  awayScore: 1,
  penaltyHomeScore: 2,
  penaltyAwayScore: 1
};

test("summarizePenaltyShootout counts active penalty goals and misses by team", () => {
  const summary = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10),
    penalty("p2", "team-away", "penalty_scored", 2, 11),
    penalty("p3", "team-home", "penalty_missed_tiebreak", 3, 7),
    penalty("p4", "team-away", "penalty_missed_tiebreak", 4, 8, "2026-07-01T20:05:00.000Z"),
    penalty("p5", "team-home", "penalty_scored", 5, 9)
  ]);

  assert.equal(summary.homeAttempts, 3);
  assert.equal(summary.awayAttempts, 1);
  assert.equal(summary.homeScore, 2);
  assert.equal(summary.awayScore, 1);
  assert.equal(summary.winnerTeamId, "team-home");
  assert.equal(summary.nextSide, "away");
  assert.deepEqual(summary.home.map((attempt) => attempt.jerseyNumber), [10, 7, 9]);
});

test("formatMatchScore keeps regulation goals separate from penalty score", () => {
  assert.equal(formatMatchScore(match), "1 (2) - 1 (1)");
  assert.equal(match.homeScore, 1);
  assert.equal(match.awayScore, 1);
});

test("tied knockout match in pending_tiebreak can enter penalties", () => {
  const eligibility = getPenaltyStartEligibility({
    format: "single_elimination",
    stage: "final",
    homeScore: 3,
    awayScore: 3,
    liveStatus: "pending_tiebreak",
    penaltiesEnabled: true,
    homeTeamId: "team-home",
    awayTeamId: "team-away"
  });

  assert.equal(eligibility.allowed, true);
  assert.equal(eligibility.reason, "allowed");
});

test("compatible second-half state can enter penalties when tied knockout requires winner", () => {
  const eligibility = getPenaltyStartEligibility({
    format: "groups_then_knockout",
    stage: "semi_finals",
    homeScore: 2,
    awayScore: 2,
    liveStatus: "in_progress_second_half",
    penaltiesEnabled: true,
    homeTeamId: "team-home",
    awayTeamId: "team-away"
  });

  assert.equal(eligibility.allowed, true);
});

test("penalties are rejected when match is not tied or does not require a knockout winner", () => {
  assert.deepEqual(
    getPenaltyStartEligibility({
      format: "single_elimination",
      stage: "final",
      homeScore: 2,
      awayScore: 1,
      liveStatus: "pending_tiebreak",
      penaltiesEnabled: true,
      homeTeamId: "team-home",
      awayTeamId: "team-away"
    }),
    { allowed: false, reason: "not_tied" }
  );

  assert.deepEqual(
    getPenaltyStartEligibility({
      format: "league",
      stage: "group_stage",
      homeScore: 1,
      awayScore: 1,
      liveStatus: "pending_tiebreak",
      penaltiesEnabled: true,
      homeTeamId: "team-home",
      awayTeamId: "team-away"
    }),
    { allowed: false, reason: "not_knockout" }
  );
});

test("closed matches cannot enter penalties", () => {
  for (const liveStatus of ["validated", "cancelled"] as const) {
    const eligibility = getPenaltyStartEligibility({
      format: "single_elimination",
      stage: "final",
      homeScore: 1,
      awayScore: 1,
      liveStatus,
      penaltiesEnabled: true,
      homeTeamId: "team-home",
      awayTeamId: "team-away"
    });

    assert.equal(eligibility.allowed, false);
    assert.equal(eligibility.reason, "closed");
  }
});

test("penalty visual tones are green for scored and red for missed", () => {
  assert.equal(penaltyAttemptTone(true), "green");
  assert.equal(penaltyAttemptTone(false), "red");
});

test("corrected penalty is ignored when recalculating score and winner", () => {
  const summary = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10),
    penalty("p2", "team-away", "penalty_scored", 2, 11),
    penalty("p3", "team-home", "penalty_scored", 3, 7, "2026-07-01T20:04:00.000Z")
  ]);

  assert.equal(summary.homeScore, 1);
  assert.equal(summary.awayScore, 1);
  assert.equal(summary.winnerTeamId, undefined);
  assert.equal(canFinalizePenaltyShootout(summary), false);
});

test("penalty shootout can only be finalized when a winner exists", () => {
  const oneSided = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10)
  ]);
  const tied = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10),
    penalty("p2", "team-away", "penalty_scored", 2, 11)
  ]);
  const decided = summarizePenaltyShootout(match, [
    penalty("p1", "team-home", "penalty_scored", 1, 10),
    penalty("p2", "team-away", "penalty_missed_tiebreak", 2, 11)
  ]);

  assert.equal(canFinalizePenaltyShootout(oneSided), false);
  assert.equal(canFinalizePenaltyShootout(tied), false);
  assert.equal(canFinalizePenaltyShootout(decided), true);
  assert.equal(decided.winnerTeamId, "team-home");
});

test("winner advances when referee submits an official result", () => {
  assert.equal(shouldAdvanceOfficialWinner("referee_submitted"), true);
  assert.equal(shouldAdvanceOfficialWinner("corrected"), true);
  assert.equal(shouldAdvanceOfficialWinner("validated"), true);
  assert.equal(shouldAdvanceOfficialWinner("under_review"), false);
});

test("referee submitted result is public without login", () => {
  assert.equal(isPublicLiveMatch({ ...match, liveStatus: "referee_submitted", status: "finished" }), true);
});

test("referee submitted finished result updates standings immediately", () => {
  const event: TournamentEvent = {
    id: "event-1",
    name: "Copa Test",
    sportId: "sport-futsal",
    sport: "futsal",
    category: "Libre",
    formatId: "format-league",
    format: "league",
    status: "in_progress",
    registrationFee: 0,
    registrationOpenUntil: "2026-07-01",
    maxTeams: 2,
    minPlayers: 1,
    maxPlayers: 12,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    rulesSummary: "",
    preventCrossSportConflicts: false,
    minimumRestMinutes: 0
  };
  const teams: Team[] = [
    team("team-home", "Equipo A"),
    team("team-away", "Equipo B")
  ];
  const standings = calculateStandings(event, teams, [
    { ...match, status: "finished", liveStatus: "referee_submitted", homeScore: 2, awayScore: 1 }
  ]);

  assert.equal(standings[0].teamId, "team-home");
  assert.equal(standings[0].points, 3);
  assert.equal(standings[0].goalsFor, 2);
  assert.equal(standings[1].points, 0);
});

test("splitPublicLiveMatches highlights active live matches before review states", () => {
  const live: Match = {
    ...match,
    id: "live",
    liveStatus: "in_progress_second_half",
    scheduledAt: "2026-07-01T21:00:00.000Z"
  };
  const review: Match = {
    ...match,
    id: "review",
    liveStatus: "referee_submitted",
    scheduledAt: "2026-07-01T19:00:00.000Z"
  };
  const scheduled: Match = {
    ...match,
    id: "scheduled",
    liveStatus: "scheduled",
    scheduledAt: "2026-07-01T18:00:00.000Z"
  };

  const result = splitPublicLiveMatches([review, scheduled, live]);

  assert.equal(result.primary?.id, "live");
  assert.deepEqual(result.secondary.map((item) => item.id), ["review"]);
});

test("liveStatusLabel hides technical statuses from public copy", () => {
  assert.equal(liveStatusLabel("referee_submitted"), "Resultado oficial");
  assert.equal(liveStatusLabel("under_review"), "En revision");
  assert.equal(liveStatusLabel("corrected"), "Corregido");
  assert.equal(liveStatusLabel("in_progress_first_half"), "Primer tiempo");
});

test("registration only opens while event status is registration and before deadline", () => {
  const openEvent = registrationEvent({ status: "registration" });

  assert.deepEqual(
    registrationAvailability({
      event: openEvent,
      teamCount: 1,
      now: new Date("2026-06-30T12:00:00.000Z")
    }),
    { open: true, reason: "open" }
  );
  assert.equal(
    registrationAvailability({
      event: { ...openEvent, status: "draft" },
      now: new Date("2026-06-30T12:00:00.000Z")
    }).reason,
    "not_registration"
  );
  assert.equal(
    registrationAvailability({
      event: openEvent,
      now: new Date("2026-07-02T12:00:00.000Z")
    }).reason,
    "expired"
  );
  assert.equal(
    registrationAvailability({
      event: openEvent,
      teamCount: 8,
      now: new Date("2026-06-30T12:00:00.000Z")
    }).reason,
    "full"
  );
});

test("delegate edits are blocked after the event starts", () => {
  const event = registrationEvent({
    eventDate: "2026-07-01",
    scheduleConfig: {
      startTime: "09:00",
      matchDurationMinutes: 40,
      transitionMinutes: 10,
      courts: ["Cancha 1"],
      minimumRestMinutes: 0,
      allowCompactPreview: false
    }
  });

  assert.equal(canDelegateEditBeforeStart(event, new Date("2026-07-01T13:30:00.000Z")), true);
  assert.equal(canDelegateEditBeforeStart(event, new Date("2026-07-01T15:30:00.000Z")), false);
});

test("automatic delegate observations explain why teams need review", () => {
  assert.match(delegateTeamUpdateObservation, /modifico datos del equipo/);
  assert.match(delegatePlayerAddObservation, /agrego jugadores/);
  assert.match(delegatePlayerAddObservation, /aprobado/);
});

test("registration rejects invalid enrollment files and duplicate identities", () => {
  assert.equal(validateEnrollmentFileMeta({ type: "application/pdf", size: 1024 }), null);
  assert.equal(
    validateEnrollmentFileMeta({ type: "text/plain", size: 1024 }),
    "Solo se permite PDF, JPG o PNG para la ficha de matricula."
  );
  assert.equal(
    validateEnrollmentFileMeta({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    "La ficha de matricula no puede superar 5 MB."
  );
  assert.equal(findDuplicateNormalizedValue(["DNI-1", " dni-1 "]), "dni-1");
});

test("cross-team duplicate DNI and student code are detected inside active teams", () => {
  const existingTeams = [
    team("team-1", "Equipo 1"),
    { ...team("team-2", "Equipo 2"), status: "rejected" as const }
  ];
  const existingPlayers: Player[] = [
    player("p1", "team-1", "111", "A001"),
    player("p2", "team-2", "222", "A002")
  ];

  assert.equal(
    findCrossTeamDuplicate({
      players: [player("new", "team-new", "111", "B001")],
      existingPlayers,
      existingTeams,
      field: "dni"
    }),
    "111"
  );
  assert.equal(
    findCrossTeamDuplicate({
      players: [player("new", "team-new", "222", "A002")],
      existingPlayers,
      existingTeams,
      field: "studentCode"
    }),
    null
  );
});

test("admin approval requires payment, roster limits, semester and no duplicates", () => {
  const event = registrationEvent({ minPlayers: 2, maxPlayers: 4 });
  const currentTeam = { ...team("team-1", "Equipo 1"), paymentStatus: "pending" as const };
  const players = [
    player("p1", "team-1", "111", "A001", { enrollmentFile: "enrollment-files/p1.pdf" }),
    player("p2", "team-1", "111", "A002", { enrollmentFile: "", semester: "" })
  ];
  const issues = validateTeamApproval({
    event,
    team: currentTeam,
    players,
    allTeams: [currentTeam],
    allPlayers: players
  });

  assert.deepEqual(
    issues,
    ["payment_pending", "missing_semester", "duplicate_dni"]
  );
});

test("jersey numbers are 1-99 and can be changed once after start", () => {
  assert.equal(validateJerseyNumber(10), null);
  assert.equal(validateJerseyNumber(0), "El numero de camiseta debe estar entre 1 y 99.");
  assert.equal(canChangeJerseyNumberAfterStart({ jerseyNumberChangeCount: 0 }), true);
  assert.equal(canChangeJerseyNumberAfterStart({ jerseyNumberChangeCount: 1 }), false);
});

function penalty(
  id: string,
  teamId: string,
  eventType: "penalty_scored" | "penalty_missed_tiebreak",
  penaltyOrder: number,
  jerseyNumber: number,
  correctedAt?: string
): MatchLiveEvent {
  return {
    id,
    matchId: match.id,
    teamId,
    playerId: `${id}-player`,
    jerseyNumber,
    eventType,
    period: "penalties",
    minute: 90,
    penaltyOrder,
    createdAt: `2026-07-01T20:0${penaltyOrder}:00.000Z`,
    correctedAt
  };
}

function team(id: string, name: string): Team {
  return {
    id,
    eventId: "event-1",
    name,
    delegateName: "Delegado",
    delegatePhone: "000",
    delegateEmail: `${id}@example.com`,
    paymentMethod: "yape",
    registrationCode: id,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#2563eb",
    secondaryColor: "#f8fafc"
  };
}

function registrationEvent(
  overrides: Partial<TournamentEvent> = {}
): TournamentEvent {
  return {
    id: "event-registration",
    name: "Copa Registro",
    sportId: "sport-futsal",
    sport: "futsal",
    category: "Libre",
    formatId: "format-league",
    format: "league",
    status: "registration",
    registrationFee: 0,
    registrationOpenUntil: "2026-07-01T23:59:59.000Z",
    maxTeams: 8,
    minPlayers: 1,
    maxPlayers: 12,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    rulesSummary: "",
    preventCrossSportConflicts: false,
    minimumRestMinutes: 0,
    ...overrides
  };
}

function player(
  id: string,
  teamId: string,
  dni: string,
  studentCode: string,
  overrides: Partial<Player> = {}
): Player {
  return {
    id,
    teamId,
    firstName: "Jugador",
    lastName: id,
    dni,
    studentCode,
    enrollmentFile: "enrollment-files/ficha.pdf",
    semester: "2026-I",
    lineupRole: "starter",
    ...overrides
  };
}
