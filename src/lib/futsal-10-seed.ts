import type { CompetitionData } from "./data-mappers";
import type { Player, RegistrationCode, Team, TournamentBases, TournamentEvent, Venue } from "./types";
import { generateKnockoutMatches } from "./domain/bracket-generator";
import { generateOneDaySchedule } from "./domain/schedule-generator";

export const futsal10EventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

const eventDate = "2026-07-18T00:00:00-05:00";

export const futsal10Event: TournamentEvent = {
  id: futsal10EventId,
  name: "Futsal Varones 2026",
  sportId: "sport-futsal",
  sport: "futsal",
  category: "Varones",
  formatId: "format-knockout",
  format: "single_elimination",
  status: "registration",
  registrationFee: 40,
  registrationOpenUntil: "2026-07-17T23:59:00-05:00",
  maxTeams: 10,
  minPlayers: 8,
  maxPlayers: 12,
  pointsWin: 0,
  pointsDraw: 0,
  pointsLoss: 0,
  rulesSummary: "Eliminacion directa con ronda preliminar automatica para llegar a cuartos de final.",
  organizerName: "Comision deportiva de Ingenieria Mecanica Electrica",
  careerName: "Ingenieria Mecanica Electrica",
  careerLogoUrl: "/epime-09/logo-carrera.png",
  paymentQrYapeUrl: "/epime-09/qr-yape.png",
  paymentContactPhone: "+51923037653",
  paymentContactWhatsappUrl:
    "https://wa.me/51923037356?text=Te%20env%C3%ADo%20la%20captura.%20Por%20favor%2C%20proporci%C3%B3name%20el%20c%C3%B3digo%20%C3%BAnico%20de%20acceso.",
  themePrimaryColor: "#28398f",
  themeSecondaryColor: "#f4e84a",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 40,
  eventDate,
  fixtureStatus: "draft_auto",
  seedingMode: "manual",
  thirdPlace: true,
  allowByes: true,
  penaltiesEnabled: true,
  fixtureCompactPreview: true,
  scheduleConfig: {
    startTime: "09:00",
    matchDurationMinutes: 20,
    transitionMinutes: 10,
    courts: ["Cancha A", "Cancha B"],
    minimumRestMinutes: 40,
    allowCompactPreview: true
  }
};

export const futsal10Venues: Venue[] = [
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba1", name: "Cancha A", location: "Complejo deportivo", active: true },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", name: "Cancha B", location: "Complejo deportivo", active: true }
];

const teamSeedData = [
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc01", "Ingenieria Mecanica Electrica", "Carlos Rivas", "74396959@est.edu.unap.pe", "999 100 001", "#0f766e"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc02", "Ingenieria de Sistemas", "Valeria Torres", "renzomamanigalindo2@gmail.com", "999 100 002", "#2563eb"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc03", "Ingenieria Civil", "Miguel Salas", "miguel.salas.demo@campeonato.local", "999 100 003", "#16a34a"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc04", "Ingenieria de Minas", "Rosa Quispe", "rosa.quispe.demo@campeonato.local", "999 100 004", "#7c3aed"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc05", "Arquitectura", "Diego Paredes", "diego.paredes.demo@campeonato.local", "999 100 005", "#be123c"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc06", "Agronomia", "Patricia Leon", "patricia.leon.demo@campeonato.local", "999 100 006", "#65a30d"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc07", "Educacion Fisica", "Jorge Mamani", "jorge.mamani.demo@campeonato.local", "999 100 007", "#ea580c"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc08", "Derecho", "Lucia Ramos", "lucia.ramos.demo@campeonato.local", "999 100 008", "#334155"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc09", "Enfermeria", "Andrea Flores", "andrea.flores.demo@campeonato.local", "999 100 009", "#0891b2"],
  ["cccccccc-cccc-4ccc-8ccc-cccccccccc10", "Contabilidad", "Fernando Campos", "fernando.campos.demo@campeonato.local", "999 100 010", "#ca8a04"]
] as const;

const firstNames = [
  "Adrian",
  "Bruno",
  "Cesar",
  "Daniel",
  "Esteban",
  "Fabio",
  "Gian",
  "Hector",
  "Ivan",
  "Jair"
];

const lastNames = [
  "Apaza",
  "Benavides",
  "Castillo",
  "Delgado",
  "Espinoza",
  "Fernandez",
  "Guzman",
  "Huaman",
  "Ibarra",
  "Jimenez"
];

const futsalPositions = ["Arquero", "Defensa", "Medio", "Delantero"];

export function buildFutsal10Seed(): CompetitionData {
  const teams = createTeams();
  const players = createPlayers(teams);
  const bracketMatches = generateKnockoutMatches(teams, {
    eventId: futsal10Event.id,
    format: "single_elimination",
    maxTeams: futsal10Event.maxTeams,
    thirdPlace: true,
    seedingMode: "manual",
    manualSeeds: teams.map((team) => team.id),
    fixtureStatus: "draft_auto"
  });
  const schedule = generateOneDaySchedule(bracketMatches, {
    eventDate: futsal10Event.eventDate ?? eventDate,
    startTime: futsal10Event.scheduleConfig?.startTime ?? "09:00",
    matchDurationMinutes: futsal10Event.scheduleConfig?.matchDurationMinutes ?? 20,
    transitionMinutes: futsal10Event.scheduleConfig?.transitionMinutes ?? 10,
    courts: futsal10Event.scheduleConfig?.courts ?? ["Cancha A", "Cancha B"],
    minimumRestMinutes: futsal10Event.minimumRestMinutes,
    respectRoundDependencies: true,
    allowCompactPreview: true
  });

  return {
    events: [futsal10Event],
    teams,
    players,
    matches: schedule.matches,
    registrationCodes: createRegistrationCodes(teams),
    sports: [
      { id: "sport-futsal", name: "Futsal", playersPerTeam: 5, matchDuration: 20, active: true }
    ],
    competitionFormats: [
      {
        id: "format-knockout",
        name: "Eliminacion directa",
        key: "single_elimination",
        description: "Ronda preliminar, cuartos, semifinal, final y tercer lugar",
        active: true
      }
    ],
    venues: futsal10Venues,
    timeSlots: [],
    groups: [],
    groupTeams: [],
    groupStandings: [],
    tournamentBases: [createBases()]
  };
}

function createTeams(): Team[] {
  return teamSeedData.map(([id, name, delegateName, delegateEmail, delegatePhone, color], index) => ({
    id,
    eventId: futsal10Event.id,
    name,
    delegateName,
    delegatePhone,
    delegateEmail,
    academicCareer: name,
    paymentMethod: index % 2 === 0 ? "yape" : "plin",
    registrationCode: `FUTSAL-2026-${String(index + 1).padStart(3, "0")}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc",
    createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T09:00:00-05:00`
  }));
}

function createPlayers(teams: Team[]): Player[] {
  return teams.flatMap((team, teamIndex) =>
    Array.from({ length: 8 }, (_, playerIndex) => {
      const globalIndex = teamIndex * 8 + playerIndex + 1;
      return {
        id: `player-${String(globalIndex).padStart(3, "0")}`,
        teamId: team.id,
        firstName: firstNames[(globalIndex - 1) % firstNames.length],
        lastName: lastNames[(teamIndex + playerIndex) % lastNames.length],
        dni: String(70000000 + globalIndex).padStart(8, "0"),
        studentCode: `2026${String(globalIndex).padStart(4, "0")}`,
        enrollmentFile: `ficha-${team.id}-${playerIndex + 1}.pdf`,
        semester: `${(playerIndex % 10) + 1} ciclo`,
        lineupRole: playerIndex < 5 ? "starter" : "substitute",
        jerseyNumber: playerIndex + 1,
        position: futsalPositions[playerIndex % futsalPositions.length]
      };
    })
  );
}

function createRegistrationCodes(teams: Team[]): RegistrationCode[] {
  return teams.map((team, index) => ({
    id: `code-${String(index + 1).padStart(3, "0")}`,
    eventId: futsal10Event.id,
    code: team.registrationCode,
    paymentMethod: team.paymentMethod,
    status: "used",
    usedByTeamId: team.id
  }));
}

function createBases(): TournamentBases {
  return {
    id: "bases-futsal-varones-2026",
    championshipName: futsal10Event.name,
    year: 2026,
    organizer: "Comision deportiva universitaria",
    startDate: futsal10Event.eventDate ?? eventDate,
    endDate: futsal10Event.eventDate ?? eventDate,
    description: "Bases de prueba para validar generacion automatica de fixture de futsal varones con 10 equipos.",
    matchDuration: 20,
    pointsWin: 0,
    pointsDraw: 0,
    pointsLoss: 0,
    tiebreakerRules: "En eliminacion directa, empate al final del tiempo reglamentario se define por penales.",
    walkoverRules: "Tolerancia de 5 minutos. Ausencia del equipo implica W.O. y clasificacion del rival.",
    maxPlayersPerTeam: futsal10Event.maxPlayers,
    sanctions: "Tarjeta roja directa suspende al jugador para el siguiente partido.",
    published: true
  };
}
