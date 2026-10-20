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

export const voley20EventId = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";

const eventDate = "2025-11-08T00:00:00-05:00";

export const voley20Event: TournamentEvent = {
  id: voley20EventId,
  name: "Voley Mixto 2025",
  sportId: "sport-voley",
  sport: "voley",
  category: "Mixto",
  formatId: "format-groups",
  format: "groups_then_knockout",
  status: "registration",
  registrationFee: 30,
  registrationOpenUntil: "2025-11-07T23:59:00-05:00",
  maxTeams: 20,
  minPlayers: 6,
  maxPlayers: 10,
  pointsWin: 3,
  pointsDraw: 0,
  pointsLoss: 0,
  rulesSummary:
    "20 equipos en 4 grupos de 5. Clasifican los dos primeros de cada grupo (8 equipos). Eliminatorias: cuartos, semifinales, tercer lugar y final. Sets al mejor de 3: primeros dos sets a 25 puntos, tercer set a 15 puntos. Composicion: 5 varones y 1 mujer, estudiantes activos de la universidad.",
  organizerName: "Comision deportiva de Ingenieria Mecanica Electrica",
  careerName: "Ingenieria Mecanica Electrica",
  careerLogoUrl: "/epime-09/logo-carrera.png",
  paymentQrYapeUrl: "/epime-09/qr-yape.png",
  paymentContactPhone: DEFAULT_PAYMENT_CONTACT_PHONE,
  paymentContactWhatsappUrl: DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL,
  themePrimaryColor: "#28398f",
  themeSecondaryColor: "#f4e84a",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 30,
  eventDate,
  fixtureStatus: "draft_auto",
  seedingMode: "random",
  thirdPlace: true,
  allowByes: false,
  penaltiesEnabled: false,
  qualifyBestThirds: false,
  fixtureCompactPreview: true,
  scheduleConfig: {
    startTime: "08:00",
    matchDurationMinutes: 60,
    halfTimeMinute: 0,
    halfTimeBreakMinutes: 0,
    additionalTimeAllowedMinutes: 0,
    matchStartToleranceMinutes: 5,
    transitionMinutes: 10,
    courts: ["Cancha Voley 1", "Cancha Voley 2"],
    courtCount: 2,
    minimumRestMinutes: 30,
    allowCompactPreview: true,
    estimatedEndTime: "18:00"
  }
};

export const voley20Venues: Venue[] = [
  { id: "dddddddd-dddd-4ddd-8ddd-dddddddddd11", name: "Cancha Voley 1", location: "Sede principal", active: true },
  { id: "dddddddd-dddd-4ddd-8ddd-dddddddddd12", name: "Cancha Voley 2", location: "Sede principal", active: true }
];

const teamSeedData = [
  ["Ingenieria Electronica A",       "Carmen Quispe",    "#1d4ed8"],
  ["Ingenieria Mecanica Electrica A", "Ana Rivas",       "#0f766e"],
  ["Ingenieria de Sistemas A",       "Diana Torres",     "#2563eb"],
  ["Ingenieria Civil A",             "Elena Salas",      "#16a34a"],
  ["Ingenieria de Minas A",          "Fiorella Quispe",  "#7c3aed"],
  ["Arquitectura",                   "Gisela Paredes",   "#be123c"],
  ["Agronomia",                      "Hilda Leon",       "#65a30d"],
  ["Educacion Fisica",               "Irene Mamani",     "#ea580c"],
  ["Derecho",                        "Julia Ramos",      "#334155"],
  ["Enfermeria",                     "Karina Flores",    "#0891b2"],
  ["Contabilidad",                   "Laura Campos",     "#ca8a04"],
  ["Ingenieria Industrial",          "Maria Vargas",     "#c026d3"],
  ["Medicina Humana",                "Nancy Cardenas",   "#059669"],
  ["Ingenieria Quimica",             "Olga Nunez",       "#7f1d1d"],
  ["Administracion",                 "Patricia Huanca",  "#b45309"],
  ["Biologia",                       "Rosa Cahuana",     "#15803d"],
  ["Fisica",                         "Sandra Larico",    "#9333ea"],
  ["Odontologia",                    "Teresa Chura",     "#0e7490"],
  ["Ingenieria Electronica B",       "Ursula Ccallo",    "#1e40af"],
  ["Ingenieria Mecanica Electrica B","Victoria Ramos",   "#134e4a"]
] as const;

// 4 grupos de 5 equipos → 20 partidos por grupo (C(5,2)=10) × 4 = 40 partidos de grupos
const groupDistribution: Array<{ name: string; teamIndexes: number[] }> = [
  { name: "Grupo A", teamIndexes: [0,  1,  2,  3,  4]  },
  { name: "Grupo B", teamIndexes: [5,  6,  7,  8,  9]  },
  { name: "Grupo C", teamIndexes: [10, 11, 12, 13, 14] },
  { name: "Grupo D", teamIndexes: [15, 16, 17, 18, 19] }
];

const groupLetters = ["A", "B", "C", "D"] as const;

const firstNames = ["Adriana", "Beatriz", "Carla", "Daniela", "Elena", "Fabiola", "Gisela", "Hilda"];
const lastNames  = ["Apaza", "Benavides", "Castillo", "Delgado", "Espinoza", "Fernandez", "Guzman", "Huaman"];
const voleyPositions = ["Armadora", "Opuesta", "Central", "Punta", "Libero", "Servidor"];

export function buildVoley20Seed(): CompetitionData {
  const teams   = createTeams();
  const players = createPlayers(teams);
  const groups  = createGroups();
  const groupTeams   = createGroupTeams(groups, teams);
  const groupMatches = createGroupStageMatches(teams, groups);
  const knockoutMatches = createKnockoutMatches();

  const scheduled = generateOneDaySchedule(
    [...groupMatches, ...knockoutMatches],
    {
      eventDate: voley20Event.eventDate ?? eventDate,
      startTime: voley20Event.scheduleConfig?.startTime ?? "08:00",
      matchDurationMinutes: voley20Event.scheduleConfig?.matchDurationMinutes ?? 60,
      transitionMinutes: voley20Event.scheduleConfig?.transitionMinutes ?? 10,
      courts: voley20Event.scheduleConfig?.courts ?? ["Cancha Voley 1", "Cancha Voley 2"],
      minimumRestMinutes: voley20Event.minimumRestMinutes,
      respectRoundDependencies: true,
      allowCompactPreview: voley20Event.fixtureCompactPreview ?? true
    }
  );

  return {
    events: [voley20Event],
    teams,
    players,
    matches: scheduled.matches,
    registrationCodes: createRegistrationCodes(teams),
    sports: [
      { id: "sport-voley", name: "Voley", playersPerTeam: 6, matchDuration: 60, active: true }
    ],
    competitionFormats: [
      {
        id: "format-groups",
        name: "Grupos + Eliminacion",
        key: "groups_then_knockout",
        description:
          "Fase de grupos con clasificacion de los dos primeros y llave de eliminacion directa",
        active: true
      }
    ],
    venues: voley20Venues,
    timeSlots: [],
    groups,
    groupTeams,
    groupStandings: [],
    tournamentBases: [createBases()]
  };
}

function createTeams(): Team[] {
  return teamSeedData.map(([name, delegateName, color], index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-dd${String(index + 1).padStart(10, "0")}`,
    eventId: voley20EventId,
    name,
    delegateName,
    delegatePhone: `999 400 ${String(index + 1).padStart(3, "0")}`,
    delegateEmail: `voley20.equipo${index + 1}@campeonato.local`,
    academicCareer: name.replace(/ [AB]$/, ""),
    paymentMethod: index % 2 === 0 ? "yape" : "plin",
    registrationCode: `VOLEY20-2025-${String(index + 1).padStart(3, "0")}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc",
    createdAt: `2025-10-${String(index + 1).padStart(2, "0")}T09:00:00-05:00`
  }));
}

function createPlayers(teams: Team[]): Player[] {
  return teams.flatMap((team, teamIndex) =>
    Array.from({ length: 7 }, (_, playerIndex) => {
      const globalIndex = teamIndex * 7 + playerIndex + 1;
      return {
        id: `voley20-player-${String(globalIndex).padStart(3, "0")}`,
        teamId: team.id,
        firstName: firstNames[(globalIndex - 1) % firstNames.length],
        lastName: lastNames[(teamIndex + playerIndex) % lastNames.length],
        dni: String(73000000 + globalIndex).padStart(8, "0"),
        studentCode: `2025V${String(globalIndex).padStart(4, "0")}`,
        enrollmentFile: `ficha-${team.id}-${playerIndex + 1}.pdf`,
        semester: `${(playerIndex % 10) + 1} ciclo`,
        lineupRole: playerIndex < 6 ? "starter" : "substitute",
        jerseyNumber: playerIndex + 1,
        position: voleyPositions[playerIndex % voleyPositions.length]
      } satisfies Player;
    })
  );
}

function createGroups(): Group[] {
  return groupDistribution.map((group, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-dd2${String(index + 1).padStart(9, "0")}`,
    eventId: voley20EventId,
    name: group.name,
    createdAt: `2025-10-${String(index + 1).padStart(2, "0")}T08:00:00-05:00`
  }));
}

function createGroupTeams(groups: Group[], teams: Team[]): GroupTeam[] {
  return groupDistribution.flatMap((group, groupIndex) =>
    group.teamIndexes.map((teamIndex, teamIndexInGroup) => ({
      id: `voley20-gt-${groupIndex + 1}-${teamIndexInGroup + 1}`,
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
    const roundRobin = generateRoundRobinMatches(voley20EventId, teamIds);

    return roundRobin.map((match, matchIndex) => ({
      ...match,
      id: `${voley20EventId}-g${letter}${matchIndex + 1}`,
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

// 8 equipos directo a cuartos (1° y 2° de cada grupo)
function createKnockoutMatches(): Match[] {
  const base = {
    eventId: voley20EventId,
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled" as const,
    fixtureStatus: "draft_auto" as const,
    isFixturePreliminary: true
  };

  const c1    = `${voley20EventId}-c1`;
  const c2    = `${voley20EventId}-c2`;
  const c3    = `${voley20EventId}-c3`;
  const c4    = `${voley20EventId}-c4`;
  const s1    = `${voley20EventId}-s1`;
  const s2    = `${voley20EventId}-s2`;
  const third = `${voley20EventId}-3l`;
  const final = `${voley20EventId}-f`;

  return [
    { ...base, id: c1, round: 3, stage: "quarter_finals" as const, bracketPosition: 1, label: "C1",
      homePlaceholder: "1ro Grupo A", awayPlaceholder: "2do Grupo B", nextMatchId: s1 },
    { ...base, id: c2, round: 3, stage: "quarter_finals" as const, bracketPosition: 2, label: "C2",
      homePlaceholder: "1ro Grupo B", awayPlaceholder: "2do Grupo A", nextMatchId: s1 },
    { ...base, id: c3, round: 3, stage: "quarter_finals" as const, bracketPosition: 3, label: "C3",
      homePlaceholder: "1ro Grupo C", awayPlaceholder: "2do Grupo D", nextMatchId: s2 },
    { ...base, id: c4, round: 3, stage: "quarter_finals" as const, bracketPosition: 4, label: "C4",
      homePlaceholder: "1ro Grupo D", awayPlaceholder: "2do Grupo C", nextMatchId: s2 },
    { ...base, id: s1, round: 4, stage: "semi_finals" as const, bracketPosition: 1, label: "S1",
      homePlaceholder: "Ganador C1", awayPlaceholder: "Ganador C2",
      homeSourceMatchId: c1, awaySourceMatchId: c2, sourceMatchIds: [c1, c2], dependsOnMatchIds: [c1, c2],
      nextMatchId: final },
    { ...base, id: s2, round: 4, stage: "semi_finals" as const, bracketPosition: 2, label: "S2",
      homePlaceholder: "Ganador C3", awayPlaceholder: "Ganador C4",
      homeSourceMatchId: c3, awaySourceMatchId: c4, sourceMatchIds: [c3, c4], dependsOnMatchIds: [c3, c4],
      nextMatchId: final },
    { ...base, id: third, round: 5, stage: "third_place" as const, bracketPosition: 1, label: "3L",
      homePlaceholder: "Perdedor S1", awayPlaceholder: "Perdedor S2",
      homeSourceMatchId: s1, awaySourceMatchId: s2, sourceMatchIds: [s1, s2], dependsOnMatchIds: [s1, s2] },
    { ...base, id: final, round: 6, stage: "final" as const, bracketPosition: 1, label: "F",
      homePlaceholder: "Ganador S1", awayPlaceholder: "Ganador S2",
      homeSourceMatchId: s1, awaySourceMatchId: s2, sourceMatchIds: [s1, s2], dependsOnMatchIds: [s1, s2] }
  ];
}

function createRegistrationCodes(teams: Team[]): RegistrationCode[] {
  return teams.map((team, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-dd3${String(index + 1).padStart(9, "0")}`,
    eventId: voley20EventId,
    code: team.registrationCode,
    paymentMethod: team.paymentMethod,
    status: "used",
    usedByTeamId: team.id
  }));
}

function createBases(): TournamentBases {
  return {
    id: "bases-voley-mixto-2025",
    championshipName: voley20Event.name,
    year: 2025,
    organizer: "Comision deportiva de Ingenieria Mecanica Electrica",
    startDate: voley20Event.eventDate ?? eventDate,
    endDate: voley20Event.eventDate ?? eventDate,
    description:
      "Campeonato de voley mixto con 20 equipos en 4 grupos de 5. Clasifican los dos primeros de cada grupo (8 equipos) a eliminatorias directas.",
    matchDuration: 60,
    pointsWin: 3,
    pointsDraw: 0,
    pointsLoss: 0,
    tiebreakerRules:
      "Sets ganados, sets perdidos, puntos a favor, puntos en contra, resultado directo.",
    walkoverRules:
      "Tolerancia de 5 minutos. Ausencia del equipo implica W.O. y clasificacion del rival.",
    maxPlayersPerTeam: voley20Event.maxPlayers,
    sanctions:
      "Tarjeta amarilla: punto al rival. Tarjeta roja: expulsion del set. Sets al mejor de 3: sets 1 y 2 a 25 puntos, tercer set a 15 puntos (ventaja de 2 en todos). Composicion: 5 varones y 1 mujer en cancha.",
    published: true
  };
}
