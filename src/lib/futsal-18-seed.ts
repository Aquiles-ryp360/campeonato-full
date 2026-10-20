import type { CompetitionData } from "./data-mappers";
import type {
  Group,
  GroupTeam,
  Match,
  Player,
  RegistrationCode,
  Team,
  TournamentBases,
  TournamentEvent,
  Venue
} from "./types";
import {
  DEFAULT_PAYMENT_CONTACT_PHONE,
  DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL
} from "./payment-contact";
import { generateOneDaySchedule } from "./domain/schedule-generator";
import { generateRoundRobinMatches } from "./scheduler";

export const futsal18EventId = "cccccccc-cccc-4ccc-8ccc-cccccccccc01";

const eventDate = "2025-11-01T00:00:00-05:00";

export const futsal18Event: TournamentEvent = {
  id: futsal18EventId,
  name: "Futsal Varones 2025",
  sportId: "sport-futsal",
  sport: "futsal",
  category: "Varones",
  formatId: "format-groups",
  format: "groups_then_knockout",
  status: "registration",
  registrationFee: 40,
  registrationOpenUntil: "2025-10-31T23:59:00-05:00",
  maxTeams: 18,
  minPlayers: 5,
  maxPlayers: 10,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  rulesSummary:
    "18 equipos en 6 grupos de 3. Clasifican los dos primeros de cada grupo (12 equipos). Segunda ronda: 4 grupos de 3 sin repetir rivales, clasifican 2 por grupo (8 equipos). Eliminatorias: cuartos, semifinales, tercer lugar y final.",
  organizerName: "Comision deportiva de Ingenieria Mecanica Electrica",
  careerName: "Ingenieria Mecanica Electrica",
  careerLogoUrl: "/epime-09/logo-carrera.png",
  paymentQrYapeUrl: "/epime-09/qr-yape.png",
  paymentContactPhone: DEFAULT_PAYMENT_CONTACT_PHONE,
  paymentContactWhatsappUrl: DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL,
  themePrimaryColor: "#28398f",
  themeSecondaryColor: "#f4e84a",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 20,
  eventDate,
  fixtureStatus: "draft_auto",
  seedingMode: "random",
  thirdPlace: true,
  allowByes: false,
  penaltiesEnabled: true,
  qualifyBestThirds: false,
  fixtureCompactPreview: true,
  scheduleConfig: {
    startTime: "08:00",
    matchDurationMinutes: 20,
    halfTimeMinute: 10,
    halfTimeBreakMinutes: 0,
    additionalTimeAllowedMinutes: 0,
    matchStartToleranceMinutes: 5,
    transitionMinutes: 5,
    courts: ["Cancha 1", "Cancha 2"],
    courtCount: 2,
    minimumRestMinutes: 20,
    allowCompactPreview: true,
    estimatedEndTime: "18:00"
  }
};

export const futsal18Venues: Venue[] = [
  { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc11", name: "Cancha 1", location: "Sede principal", active: true },
  { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc12", name: "Cancha 2", location: "Sede principal", active: true }
];

const teamSeedData = [
  ["Ingenieria Electronica",      "Bruno Ccallo",      "#1d4ed8"],
  ["Ingenieria Mecanica Electrica","Carlos Rivas",     "#0f766e"],
  ["Ingenieria de Sistemas",      "Valeria Torres",    "#2563eb"],
  ["Ingenieria Civil",            "Miguel Salas",      "#16a34a"],
  ["Ingenieria de Minas",         "Rosa Quispe",       "#7c3aed"],
  ["Arquitectura",                "Diego Paredes",     "#be123c"],
  ["Agronomia",                   "Patricia Leon",     "#65a30d"],
  ["Educacion Fisica",            "Jorge Mamani",      "#ea580c"],
  ["Derecho",                     "Lucia Ramos",       "#334155"],
  ["Enfermeria",                  "Andrea Flores",     "#0891b2"],
  ["Contabilidad",                "Fernando Campos",   "#ca8a04"],
  ["Ingenieria Industrial",       "Sofia Vargas",      "#c026d3"],
  ["Medicina Humana",             "Luis Cardenas",     "#059669"],
  ["Ingenieria Quimica",          "Karla Nunez",       "#7f1d1d"],
  ["Administracion",              "Gloria Huanca",     "#b45309"],
  ["Biologia",                    "Raul Cahuana",      "#15803d"],
  ["Fisica",                      "Monica Larico",     "#9333ea"],
  ["Odontologia",                 "Pablo Chura",       "#0e7490"]
] as const;

// Fase 1: 6 grupos de 3 equipos
const groupDistribution: Array<{ name: string; teamIndexes: number[] }> = [
  { name: "Grupo A", teamIndexes: [0,  1,  2]  },
  { name: "Grupo B", teamIndexes: [3,  4,  5]  },
  { name: "Grupo C", teamIndexes: [6,  7,  8]  },
  { name: "Grupo D", teamIndexes: [9,  10, 11] },
  { name: "Grupo E", teamIndexes: [12, 13, 14] },
  { name: "Grupo F", teamIndexes: [15, 16, 17] }
];

const groupLetters = ["A", "B", "C", "D", "E", "F"] as const;

// Fase 2: cruce sin repetir rivales (1°X y 2°X nunca en el mismo grupo)
// W: 1°A · 2°B · 1°C  |  X: 2°A · 1°B · 2°C
// Y: 1°D · 2°E · 1°F  |  Z: 2°D · 1°E · 2°F
const phase2Groups = {
  W: { homePlaceholders: ["1ro Grupo A", "1ro Grupo A", "2do Grupo B"], awayPlaceholders: ["2do Grupo B", "1ro Grupo C", "1ro Grupo C"] },
  X: { homePlaceholders: ["2do Grupo A", "2do Grupo A", "1ro Grupo B"], awayPlaceholders: ["1ro Grupo B", "2do Grupo C", "2do Grupo C"] },
  Y: { homePlaceholders: ["1ro Grupo D", "1ro Grupo D", "2do Grupo E"], awayPlaceholders: ["2do Grupo E", "1ro Grupo F", "1ro Grupo F"] },
  Z: { homePlaceholders: ["2do Grupo D", "2do Grupo D", "1ro Grupo E"], awayPlaceholders: ["1ro Grupo E", "2do Grupo F", "2do Grupo F"] }
} as const;

const firstNames = ["Adrian", "Bruno", "Cesar", "Daniel", "Esteban", "Fabio", "Gian", "Hector"];
const lastNames  = ["Apaza", "Benavides", "Castillo", "Delgado", "Espinoza", "Fernandez", "Guzman", "Huaman"];
const futsalPositions = ["Portero", "Cierre", "Ala", "Pivot"];

export function buildFutsal18Seed(): CompetitionData {
  const teams   = createTeams();
  const players = createPlayers(teams);
  const groups  = createGroups();
  const groupTeams   = createGroupTeams(groups, teams);
  const groupMatches = createGroupStageMatches(teams, groups);
  const phase2Matches   = createPhase2Matches();
  const knockoutMatches = createKnockoutMatches();

  const scheduled = generateOneDaySchedule(
    [...groupMatches, ...phase2Matches, ...knockoutMatches],
    {
      eventDate: futsal18Event.eventDate ?? eventDate,
      startTime: futsal18Event.scheduleConfig?.startTime ?? "08:00",
      matchDurationMinutes: futsal18Event.scheduleConfig?.matchDurationMinutes ?? 20,
      transitionMinutes: futsal18Event.scheduleConfig?.transitionMinutes ?? 5,
      courts: futsal18Event.scheduleConfig?.courts ?? ["Cancha 1", "Cancha 2"],
      minimumRestMinutes: futsal18Event.minimumRestMinutes,
      respectRoundDependencies: true,
      allowCompactPreview: futsal18Event.fixtureCompactPreview ?? true
    }
  );

  return {
    events: [futsal18Event],
    teams,
    players,
    matches: scheduled.matches,
    registrationCodes: createRegistrationCodes(teams),
    sports: [
      { id: "sport-futsal", name: "Futsal", playersPerTeam: 5, matchDuration: 20, active: true }
    ],
    competitionFormats: [
      {
        id: "format-groups",
        name: "Grupos + Eliminacion",
        key: "groups_then_knockout",
        description:
          "Fase de grupos con clasificacion de los dos primeros y llave final con segunda ronda de grupos",
        active: true
      }
    ],
    venues: futsal18Venues,
    timeSlots: [],
    groups,
    groupTeams,
    groupStandings: [],
    tournamentBases: [createBases()]
  };
}

function createTeams(): Team[] {
  return teamSeedData.map(([name, delegateName, color], index) => ({
    id: `cccccccc-cccc-4ccc-8ccc-cc${String(index + 1).padStart(10, "0")}`,
    eventId: futsal18EventId,
    name,
    delegateName,
    delegatePhone: `999 300 ${String(index + 1).padStart(3, "0")}`,
    delegateEmail: `futsal18.equipo${index + 1}@campeonato.local`,
    academicCareer: name,
    paymentMethod: index % 2 === 0 ? "yape" : "plin",
    registrationCode: `FUTSAL18-2025-${String(index + 1).padStart(3, "0")}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc",
    createdAt: `2025-10-${String(index + 1).padStart(2, "0")}T09:00:00-05:00`
  }));
}

function createPlayers(teams: Team[]): Player[] {
  return teams.flatMap((team, teamIndex) =>
    Array.from({ length: 6 }, (_, playerIndex) => {
      const globalIndex = teamIndex * 6 + playerIndex + 1;
      return {
        id: `futsal18-player-${String(globalIndex).padStart(3, "0")}`,
        teamId: team.id,
        firstName: firstNames[(globalIndex - 1) % firstNames.length],
        lastName: lastNames[(teamIndex + playerIndex) % lastNames.length],
        dni: String(72000000 + globalIndex).padStart(8, "0"),
        studentCode: `2025${String(globalIndex).padStart(5, "0")}`,
        enrollmentFile: `ficha-${team.id}-${playerIndex + 1}.pdf`,
        semester: `${(playerIndex % 10) + 1} ciclo`,
        lineupRole: playerIndex < 5 ? "starter" : "substitute",
        jerseyNumber: playerIndex + 1,
        position: futsalPositions[playerIndex % futsalPositions.length]
      } satisfies Player;
    })
  );
}

function createGroups(): Group[] {
  return groupDistribution.map((group, index) => ({
    id: `cccccccc-cccc-4ccc-8ccc-cc2${String(index + 1).padStart(9, "0")}`,
    eventId: futsal18EventId,
    name: group.name,
    createdAt: `2025-10-${String(index + 1).padStart(2, "0")}T08:00:00-05:00`
  }));
}

function createGroupTeams(groups: Group[], teams: Team[]): GroupTeam[] {
  return groupDistribution.flatMap((group, groupIndex) =>
    group.teamIndexes.map((teamIndex, teamIndexInGroup) => ({
      id: `futsal18-gt-${groupIndex + 1}-${teamIndexInGroup + 1}`,
      groupId: groups[groupIndex].id,
      teamId: teams[teamIndex].id,
      createdAt: `2025-10-${String(groupIndex + 1).padStart(2, "0")}T08:30:00-05:00`
    }))
  );
}

function createGroupStageMatches(teams: Team[], groups: Group[]): Match[] {
  return groupDistribution.flatMap((group, groupIndex) => {
    const groupId = groups[groupIndex].id;
    const letter  = groupLetters[groupIndex];
    const teamIds = group.teamIndexes.map((i) => teams[i].id);
    const roundRobin = generateRoundRobinMatches(futsal18EventId, teamIds);

    return roundRobin.map((match, matchIndex) => ({
      ...match,
      id: `${futsal18EventId}-g${letter}${matchIndex + 1}`,
      round: match.round,
      stage: "group_stage" as const,
      groupId,
      bracketPosition: matchIndex + 1,
      label: `${letter}${matchIndex + 1}`,
      homePlaceholder: undefined,
      awayPlaceholder: undefined,
      court: "Cancha por definir",
      status: "scheduled" as const,
      fixtureStatus: "draft_auto" as const,
      isFixturePreliminary: true
    }));
  });
}

// Fase 2: 4 grupos de 3 — 12 partidos en ronda preliminar
function createPhase2Matches(): Match[] {
  const base = {
    eventId: futsal18EventId,
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled" as const,
    fixtureStatus: "draft_auto" as const,
    isFixturePreliminary: true,
    stage: "preliminary" as const,
    round: 4
  };

  return (Object.entries(phase2Groups) as Array<[keyof typeof phase2Groups, (typeof phase2Groups)[keyof typeof phase2Groups]]>).flatMap(
    ([groupLetter, { homePlaceholders, awayPlaceholders }]) =>
      [0, 1, 2].map((i) => ({
        ...base,
        id: `${futsal18EventId}-p${groupLetter}${i + 1}`,
        bracketPosition: i + 1,
        label: `${groupLetter}${i + 1}`,
        homePlaceholder: homePlaceholders[i],
        awayPlaceholder: awayPlaceholders[i]
      }))
  );
}

// Eliminatorias — 8 equipos (1W, 2W, 1X, 2X, 1Y, 2Y, 1Z, 2Z)
function createKnockoutMatches(): Match[] {
  const base = {
    eventId: futsal18EventId,
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled" as const,
    fixtureStatus: "draft_auto" as const,
    isFixturePreliminary: true
  };

  const c1    = `${futsal18EventId}-c1`;
  const c2    = `${futsal18EventId}-c2`;
  const c3    = `${futsal18EventId}-c3`;
  const c4    = `${futsal18EventId}-c4`;
  const s1    = `${futsal18EventId}-s1`;
  const s2    = `${futsal18EventId}-s2`;
  const third = `${futsal18EventId}-3l`;
  const final = `${futsal18EventId}-f`;

  return [
    { ...base, id: c1, round: 5, stage: "quarter_finals" as const, bracketPosition: 1, label: "C1",
      homePlaceholder: "1ro Grupo W", awayPlaceholder: "2do Grupo X", nextMatchId: s1 },
    { ...base, id: c2, round: 5, stage: "quarter_finals" as const, bracketPosition: 2, label: "C2",
      homePlaceholder: "1ro Grupo X", awayPlaceholder: "2do Grupo W", nextMatchId: s1 },
    { ...base, id: c3, round: 5, stage: "quarter_finals" as const, bracketPosition: 3, label: "C3",
      homePlaceholder: "1ro Grupo Y", awayPlaceholder: "2do Grupo Z", nextMatchId: s2 },
    { ...base, id: c4, round: 5, stage: "quarter_finals" as const, bracketPosition: 4, label: "C4",
      homePlaceholder: "1ro Grupo Z", awayPlaceholder: "2do Grupo Y", nextMatchId: s2 },
    { ...base, id: s1, round: 6, stage: "semi_finals" as const, bracketPosition: 1, label: "S1",
      homePlaceholder: "Ganador C1", awayPlaceholder: "Ganador C2",
      homeSourceMatchId: c1, awaySourceMatchId: c2, sourceMatchIds: [c1, c2], dependsOnMatchIds: [c1, c2],
      nextMatchId: final },
    { ...base, id: s2, round: 6, stage: "semi_finals" as const, bracketPosition: 2, label: "S2",
      homePlaceholder: "Ganador C3", awayPlaceholder: "Ganador C4",
      homeSourceMatchId: c3, awaySourceMatchId: c4, sourceMatchIds: [c3, c4], dependsOnMatchIds: [c3, c4],
      nextMatchId: final },
    { ...base, id: third, round: 7, stage: "third_place" as const, bracketPosition: 1, label: "3L",
      homePlaceholder: "Perdedor S1", awayPlaceholder: "Perdedor S2",
      homeSourceMatchId: s1, awaySourceMatchId: s2, sourceMatchIds: [s1, s2], dependsOnMatchIds: [s1, s2] },
    { ...base, id: final, round: 8, stage: "final" as const, bracketPosition: 1, label: "F",
      homePlaceholder: "Ganador S1", awayPlaceholder: "Ganador S2",
      homeSourceMatchId: s1, awaySourceMatchId: s2, sourceMatchIds: [s1, s2], dependsOnMatchIds: [s1, s2] }
  ];
}

function createRegistrationCodes(teams: Team[]): RegistrationCode[] {
  return teams.map((team, index) => ({
    id: `cccccccc-cccc-4ccc-8ccc-cc3${String(index + 1).padStart(9, "0")}`,
    eventId: futsal18EventId,
    code: team.registrationCode,
    paymentMethod: team.paymentMethod,
    status: "used",
    usedByTeamId: team.id
  }));
}

function createBases(): TournamentBases {
  return {
    id: "bases-futsal-varones-2025",
    championshipName: futsal18Event.name,
    year: 2025,
    organizer: "Comision deportiva de Ingenieria Mecanica Electrica",
    startDate: futsal18Event.eventDate ?? eventDate,
    endDate: futsal18Event.eventDate ?? eventDate,
    description:
      "Campeonato de futsal con 18 equipos en 6 grupos de 3. Segunda ronda con 4 grupos de 3 sin repetir rivales. Eliminatorias de 8 equipos.",
    matchDuration: 20,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakerRules:
      "Puntos, diferencia de goles, goles a favor, resultado directo, penales.",
    walkoverRules:
      "Tolerancia de 5 minutos. Ausencia del equipo implica W.O. y clasificacion del rival.",
    maxPlayersPerTeam: futsal18Event.maxPlayers,
    sanctions:
      "Tarjeta roja directa suspende al jugador para el siguiente partido.",
    published: true
  };
}
