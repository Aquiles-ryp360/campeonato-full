import assert from "node:assert/strict";
import { generateKnockoutBracket } from "../src/lib/domain/bracket-generator";
import {
  canAccessDelegatePanel,
  getApprovedDelegateTeams,
  getPendingDelegateTeams
} from "../src/lib/domain/delegate-access";
import { canEditRegistration, isAdmin } from "../src/lib/domain/permissions";
import { isRegistrationOpen, rosterLimitState } from "../src/lib/domain/registration-rules";
import { buildDuplicateRosterAlerts, buildTeamApprovalReviews } from "../src/lib/domain/team-review";
import {
  assertCanGenerateSchedule,
  canApproveTeamAfterPayment,
  footballStats,
  teamsEligibleForSchedule,
  volleyballStats
} from "../src/lib/domain/automated-flow";
import {
  filterMatchesByCategory,
  filterTeamsByCategory,
  findCategoryBySlug,
  getSelectableEventCategories
} from "../src/lib/domain/categories";
import type { CompetitionData } from "../src/lib/data-mappers";
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
testCategoryFilters();
testFixtureUsesApprovedTeamsOnly();
testPaymentApprovalRules();
testAutomaticScheduleRules();
testResultStatsRules();
testRolePermissions();
testDelegatePanelApprovalGate();

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

function testCategoryFilters() {
  const categories = [
    {
      id: "cat-1",
      eventId: event.id,
      name: "Libre",
      slug: "libre",
      published: true,
      active: true,
      sortOrder: 1
    },
    {
      id: "cat-2",
      eventId: event.id,
      name: "Master",
      slug: "master",
      published: false,
      active: true,
      sortOrder: 2
    },
    {
      id: "cat-3",
      eventId: event.id,
      name: "Femenino",
      slug: "femenino",
      published: true,
      active: false,
      sortOrder: 3
    }
  ];
  const categoryTeams: Team[] = [
    { ...team("team-cat-1", "Libre", "approved"), categoryId: "cat-1" },
    { ...team("team-cat-2", "Master", "approved"), categoryId: "cat-2" }
  ];
  const categoryMatches = [
    { ...generateMatch("match-cat-1", event.id, "team-cat-1", "team-cat-1"), categoryId: "cat-1" },
    { ...generateMatch("match-cat-2", event.id, "team-cat-2", "team-cat-2"), categoryId: "cat-2" }
  ];
  const selectable = getSelectableEventCategories(
    {
      events: [event],
      teams: categoryTeams,
      players: [],
      matches: categoryMatches,
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
    } as CompetitionData,
    event.id
  );

  assert.equal(selectable.length, 1);
  assert.equal(selectable[0]?.name, "Libre");
  assert.equal(findCategoryBySlug(categories as never, "missing"), null);
  assert.equal(filterTeamsByCategory(categoryTeams, "cat-1").length, 1);
  assert.equal(filterMatchesByCategory(categoryMatches as never, categoryTeams, "cat-1").length, 1);
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

function testPaymentApprovalRules() {
  const pendingTeam = { ...teams[0], paymentStatus: "pending" as const };
  const approvedTeam = { ...teams[0], paymentStatus: "approved" as const };

  assert.equal(canApproveTeamAfterPayment({ event, teams: [pendingTeam], players: validPlayers, team: pendingTeam }).ok, false);
  assert.equal(canApproveTeamAfterPayment({ event, teams: [approvedTeam], players: validPlayers, team: approvedTeam }).ok, true);
}

function testAutomaticScheduleRules() {
  assert.equal(teamsEligibleForSchedule(teams).length, 2);
  assert.equal(assertCanGenerateSchedule({ assignedVenueCount: 0, activeSlotCount: 1, existingMatches: [] }), "Debes asignar canchas al campeonato antes de generar la programacion.");
  assert.equal(assertCanGenerateSchedule({ assignedVenueCount: 1, activeSlotCount: 0, existingMatches: [] }), "Debes configurar horarios disponibles antes de generar la programacion.");
  assert.equal(assertCanGenerateSchedule({ assignedVenueCount: 1, activeSlotCount: 1, existingMatches: [{ ...generateMatch("m1", event.id, "team-1", "team-4"), status: "validated" }] }), "No se puede regenerar la programacion porque ya existen resultados validados.");
}

function testResultStatsRules() {
  const match = { ...generateMatch("m2", event.id, "team-1", "team-4"), status: "validated" as const, homeScore: 2, awayScore: 1 };
  const stats = footballStats({
    teams,
    matches: [match],
    events: [
      { id: "goal-1", matchId: match.id, playerId: "p1", eventType: "goal" },
      { id: "card-1", matchId: match.id, playerId: "p1", eventType: "yellow_card" }
    ]
  });
  assert.equal(stats.standingsMatches.length, 1);
  assert.equal(stats.scorers[0]?.count, 1);
  assert.equal(stats.yellowCards[0]?.count, 1);

  const volley = volleyballStats({
    matches: [match],
    sets: [{ id: "s1", matchId: match.id, setNumber: 1, homePoints: 25, awayPoints: 20 }]
  });
  assert.equal(volley.officialMatches, 1);
  assert.equal(volley.totalPoints, 45);
}

function testRolePermissions() {
  const adminSession = session("admin", "admin@test.local");
  const delegateSession = session("delegate", teams[0].delegateEmail);

  assert.equal(isAdmin(adminSession), true);
  assert.equal(isAdmin(delegateSession), false);
  assert.equal(canEditRegistration({ ...event, status: "finished" }, teams[0], delegateSession), false);
  assert.equal(canEditRegistration(event, teams[0], delegateSession), true);
}

function testDelegatePanelApprovalGate() {
  assert.equal(canAccessDelegatePanel(teams, teams[0].delegateEmail), true);
  assert.equal(canAccessDelegatePanel(teams, teams[1].delegateEmail), false);
  assert.equal(canAccessDelegatePanel(teams, teams[2].delegateEmail), false);
  assert.equal(getApprovedDelegateTeams(teams, teams[0].delegateEmail).length, 1);
  assert.equal(getPendingDelegateTeams(teams, teams[1].delegateEmail).length, 1);
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
    paymentStatus: "approved",
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

function generateMatch(id: string, eventId: string, homeTeamId: string, awayTeamId: string) {
  return {
    id,
    eventId,
    round: 1,
    stage: "final" as const,
    homeTeamId,
    awayTeamId,
    scheduledAt: "2030-01-01T00:00:00.000Z",
    court: "Cancha",
    status: "scheduled" as const
  };
}
