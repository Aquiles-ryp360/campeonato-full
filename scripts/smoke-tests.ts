import assert from "node:assert/strict";
import { generateKnockoutBracket } from "../src/lib/domain/bracket-generator";
import { canEditRegistration, isAdmin } from "../src/lib/domain/permissions";
import { isRegistrationOpen, rosterLimitState } from "../src/lib/domain/registration-rules";
import { buildDuplicateRosterAlerts, buildTeamApprovalReviews } from "../src/lib/domain/team-review";
import type { Player, Team, TournamentEvent } from "../src/lib/types";

const event: TournamentEvent = {
  id: "event-1",
  name: "Campeonato Test",
  sportId: "sport-1",
  sport: "futbol",
  category: "Varones",
  formatId: "format-1",
  format: "single_elimination",
  status: "registration",
  registrationFee: 40,
  registrationOpenUntil: "2030-01-01T23:59:00.000Z",
  maxTeams: 8,
  minPlayers: 2,
  maxPlayers: 3,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  rulesSummary: "",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 60
};

const teams: Team[] = [
  team("team-1", "Azul", "approved"),
  team("team-2", "Rojo", "registered"),
  team("team-3", "Verde", "observed"),
  team("team-4", "Negro", "approved")
];

const validPlayers: Player[] = [
  player("p1", "team-1", "70000001", "20260001"),
  player("p2", "team-1", "70000002", "20260002"),
  player("p3", "team-2", "70000003", "20260003"),
  player("p4", "team-2", "70000004", "20260004")
];

testRegistrationRules();
testApprovalRules();
testDuplicateDetection();
testFixtureUsesApprovedTeamsOnly();
testRolePermissions();

console.log("Smoke tests passed.");

function testRegistrationRules() {
  assert.equal(isRegistrationOpen(event, new Date("2029-12-31T12:00:00.000Z")), true);
  assert.equal(isRegistrationOpen({ ...event, status: "draft" }, new Date("2029-12-31T12:00:00.000Z")), false);
  assert.equal(rosterLimitState({ event, playerCount: 1 }), "below_minimum");
  assert.equal(rosterLimitState({ event, playerCount: 2 }), "ok");
  assert.equal(rosterLimitState({ event, playerCount: 4 }), "above_maximum");
}

function testApprovalRules() {
  const reviews = buildTeamApprovalReviews({
    events: [event],
    teams,
    players: validPlayers
  });

  assert.deepEqual(reviews.get("team-1")?.issues, []);
  assert.match(reviews.get("team-3")?.issues[0] ?? "", /Faltan/);

  const tooManyPlayers = [
    ...validPlayers,
    player("p5", "team-1", "70000005", "20260005"),
    player("p6", "team-1", "70000006", "20260006")
  ];
  const tooManyReview = buildTeamApprovalReviews({ events: [event], teams, players: tooManyPlayers });
  assert.match(tooManyReview.get("team-1")?.issues[0] ?? "", /Excede/);
}

function testDuplicateDetection() {
  const duplicatedPlayers = [
    ...validPlayers,
    player("p5", "team-4", "70000001", "20269999")
  ];
  const alerts = buildDuplicateRosterAlerts(teams, duplicatedPlayers);
  assert.equal(alerts.some((alert) => alert.kind === "DNI" && alert.value === "70000001"), true);

  const reviews = buildTeamApprovalReviews({ events: [event], teams, players: duplicatedPlayers });
  assert.equal(
    reviews.get("team-1")?.issues.includes("Hay jugador(es) repetidos en otro equipo del mismo campeonato."),
    true
  );
}

function testFixtureUsesApprovedTeamsOnly() {
  const approvedTeams = teams.filter((item) => item.status === "approved");
  const bracket = generateKnockoutBracket({
    eventId: event.id,
    teams: approvedTeams,
    thirdPlace: true
  });

  assert.equal(approvedTeams.length, 2);
  assert.equal(bracket.status, "complete");
  assert.equal(bracket.matches.some((match) => match.homeTeamId === "team-2" || match.awayTeamId === "team-2"), false);
}

function testRolePermissions() {
  const adminSession = session("admin", "admin@test.local");
  const delegateSession = session("delegate", teams[0].delegateEmail);

  assert.equal(isAdmin(adminSession), true);
  assert.equal(isAdmin(delegateSession), false);
  assert.equal(canEditRegistration({ ...event, status: "finished" }, teams[0], delegateSession), false);
  assert.equal(canEditRegistration(event, teams[0], delegateSession), true);
}

function session(role: "admin" | "delegate", username: string) {
  return {
    role,
    username,
    displayName: username,
    createdAt: "2030-01-01T00:00:00.000Z"
  };
}

function team(id: string, name: string, status: Team["status"]): Team {
  return {
    id,
    eventId: event.id,
    name,
    delegateName: `Delegado ${name}`,
    delegatePhone: "999999999",
    delegateEmail: `${id}@test.local`,
    paymentMethod: "yape",
    registrationCode: `${id}-code`,
    paymentStatus: "verified",
    status,
    primaryColor: "#111111",
    secondaryColor: "#ffffff"
  };
}

function player(id: string, teamId: string, dni: string, studentCode: string): Player {
  return {
    id,
    teamId,
    firstName: `Jugador ${id}`,
    lastName: "Test",
    dni,
    studentCode,
    enrollmentFile: `${id}.pdf`,
    semester: "I",
    lineupRole: "starter"
  };
}
