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

export const futbol18EventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";

const eventDate = "2026-08-15T00:00:00-05:00";

export const futbol18Event: TournamentEvent = {
  id: futbol18EventId,
  name: "Futbol Relampago 2026",
  sportId: "sport-futbol",
  sport: "futbol",
  category: "Libre",
  formatId: "format-groups",
  format: "groups_then_knockout",
  status: "registration",
  registrationFee: 50,
  registrationOpenUntil: "2026-08-14T23:59:00-05:00",
  maxTeams: 18,
  minPlayers: 7,
  maxPlayers: 12,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  rulesSummary:
    "18 equipos en 5 grupos (4, 4, 4, 3 y 3). Clasifican los dos primeros de cada grupo. Fase final: ronda preliminar, cuartos, semifinales, tercer lugar y final.",
  organizerName: "Comision deportiva universitaria",
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
  allowByes: true,
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
    estimatedEndTime: "17:00"
  }
};

export const futbol18Venues: Venue[] = [
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb21", name: "Cancha 1", location: "Sede principal", active: true },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb22", name: "Cancha 2", location: "Sede principal", active: true }
];

const teamSeedData = [
  ["Ingenieria Mecanica Electrica", "Carlos Rivas", "#0f766e"],
  ["Ingenieria de Sistemas", "Valeria Torres", "#2563eb"],
  ["Ingenieria Civil", "Miguel Salas", "#16a34a"],
  ["Ingenieria de Minas", "Rosa Quispe", "#7c3aed"],
  ["Arquitectura", "Diego Paredes", "#be123c"],
  ["Agronomia", "Patricia Leon", "#65a30d"],
  ["Educacion Fisica", "Jorge Mamani", "#ea580c"],
  ["Derecho", "Lucia Ramos", "#334155"],
  ["Enfermeria", "Andrea Flores", "#0891b2"],
  ["Contabilidad", "Fernando Campos", "#ca8a04"],
  ["Ingenieria Industrial", "Sofia Vargas", "#c026d3"],
  ["Medicina Humana", "Luis Cardenas", "#059669"],
  ["Ingenieria Quimica", "Karla Nunez", "#7f1d1d"],
  ["Ingenieria Electronica", "Bruno Ccallo", "#1d4ed8"],
  ["Administracion", "Gloria Huanca", "#b45309"],
  ["Biologia", "Raul Cahuana", "#15803d"],
  ["Fisica", "Monica Larico", "#9333ea"],
  ["Odontologia", "Pablo Chura", "#0e7490"]
] as const;

// Distribucion oficial del informe: A y B y C con 4 equipos, D y E con 3 equipos.
const groupDistribution: Array<{ name: string; teamIndexes: number[] }> = [
  { name: "Grupo A", teamIndexes: [0, 1, 2, 3] },
  { name: "Grupo B", teamIndexes: [4, 5, 6, 7] },
  { name: "Grupo C", teamIndexes: [8, 9, 10, 11] },
  { name: "Grupo D", teamIndexes: [12, 13, 14] },
  { name: "Grupo E", teamIndexes: [15, 16, 17] }
];

const groupLetters = ["A", "B", "C", "D", "E"] as const;

const firstNames = [
  "Adrian",
  "Bruno",
  "Cesar",
  "Daniel",
  "Esteban",
  "Fabio",
  "Gian",
  "Hector"
];

const lastNames = [
  "Apaza",
  "Benavides",
  "Castillo",
  "Delgado",
  "Espinoza",
  "Fernandez",
  "Guzman",
  "Huaman"
];

const futbolPositions = ["Arquero", "Defensa", "Medio", "Delantero"];

export function buildFutbol18Seed(): CompetitionData {
  const teams = createTeams();
  const players = createPlayers(teams);
  const groups = createGroups();
  const groupTeams = createGroupTeams(groups, teams);
  const groupMatches = createGroupStageMatches(teams, groups);
  const knockoutMatches = createKnockoutMatches();
  const scheduled = generateOneDaySchedule([...groupMatches, ...knockoutMatches], {
    eventDate: futbol18Event.eventDate ?? eventDate,
    startTime: futbol18Event.scheduleConfig?.startTime ?? "08:00",
    matchDurationMinutes: futbol18Event.scheduleConfig?.matchDurationMinutes ?? 20,
    transitionMinutes: futbol18Event.scheduleConfig?.transitionMinutes ?? 5,
    courts: futbol18Event.scheduleConfig?.courts ?? ["Cancha 1", "Cancha 2"],
    minimumRestMinutes: futbol18Event.minimumRestMinutes,
    respectRoundDependencies: true,
    allowCompactPreview: futbol18Event.fixtureCompactPreview ?? true
  });

  return {
    events: [futbol18Event],
    teams,
    players,
    matches: scheduled.matches,
    registrationCodes: createRegistrationCodes(teams),
    sports: [
      { id: "sport-futbol", name: "Futbol", playersPerTeam: 7, matchDuration: 20, active: true }
    ],
    competitionFormats: [
      {
        id: "format-groups",
        name: "Grupos + Eliminacion",
        key: "groups_then_knockout",
        description:
          "Fase de grupos con clasificacion de los dos primeros y llave final con ronda preliminar",
        active: true
      }
    ],
    venues: futbol18Venues,
    timeSlots: [],
    groups,
    groupTeams,
    groupStandings: [],
    tournamentBases: [createBases()]
  };
}

function createTeams(): Team[] {
  return teamSeedData.map(([name, delegateName, color], index) => ({
    id: `cccccccc-cccc-4ccc-8ccc-ccccccccc${String(index + 101).padStart(3, "0")}`,
    eventId: futbol18Event.id,
    name,
    delegateName,
    delegatePhone: `999 200 ${String(index + 1).padStart(3, "0")}`,
    delegateEmail: `futbol18.equipo${index + 1}@campeonato.local`,
    academicCareer: name,
    paymentMethod: index % 2 === 0 ? "yape" : "plin",
    registrationCode: `FUTBOL18-2026-${String(index + 1).padStart(3, "0")}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc",
    createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T09:00:00-05:00`
  }));
}

function createPlayers(teams: Team[]): Player[] {
  return teams.flatMap((team, teamIndex) =>
    Array.from({ length: 8 }, (_, playerIndex) => {
      const globalIndex = teamIndex * 8 + playerIndex + 1;
      return {
        id: `futbol18-player-${String(globalIndex).padStart(3, "0")}`,
        teamId: team.id,
        firstName: firstNames[(globalIndex - 1) % firstNames.length],
        lastName: lastNames[(teamIndex + playerIndex) % lastNames.length],
        dni: String(71000000 + globalIndex).padStart(8, "0"),
        studentCode: `2026${String(globalIndex).padStart(5, "0")}`,
        enrollmentFile: `ficha-${team.id}-${playerIndex + 1}.pdf`,
        semester: `${(playerIndex % 10) + 1} ciclo`,
        lineupRole: playerIndex < 7 ? "starter" : "substitute",
        jerseyNumber: playerIndex + 1,
        position: futbolPositions[playerIndex % futbolPositions.length]
      } satisfies Player;
    })
  );
}

function createGroups(): Group[] {
  return groupDistribution.map((group, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-dddddddddd${String(index + 1).padStart(2, "0")}`,
    eventId: futbol18Event.id,
    name: group.name,
    createdAt: `2026-07-${String(index + 1).padStart(2, "0")}T08:00:00-05:00`
  }));
}

function createGroupTeams(groups: Group[], teams: Team[]): GroupTeam[] {
  return groupDistribution.flatMap((group, groupIndex) =>
    group.teamIndexes.map((teamIndex, teamIndexInGroup) => ({
      id: `futbol18-gt-${groupIndex + 1}-${teamIndexInGroup + 1}`,
      groupId: groups[groupIndex].id,
      teamId: teams[teamIndex].id,
      createdAt: `2026-07-${String(groupIndex + 1).padStart(2, "0")}T08:30:00-05:00`
    }))
  );
}

function createGroupStageMatches(teams: Team[], groups: Group[]): Match[] {
  return groupDistribution.flatMap((group, groupIndex) => {
    const groupId = groups[groupIndex].id;
    const letter = groupLetters[groupIndex];
    const teamIds = group.teamIndexes.map((teamIndex) => teams[teamIndex].id);
    const roundRobin = generateRoundRobinMatches(futbol18Event.id, teamIds);

    return roundRobin.map((match, matchIndex) => ({
      ...match,
      id: `${futbol18Event.id}-g${letter}${matchIndex + 1}`,
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

/**
 * Llave final de 10 equipos (clasifican los dos primeros de cada grupo).
 * 6 equipos pasan directo a cuartos y 4 disputan la ronda preliminar.
 * Criterio publicado en el informe: los subcampeones de los grupos B, C, D y E
 * juegan la preliminar; los cinco campeones y el subcampeon del grupo A pasan
 * directo a cuartos.
 */
function createKnockoutMatches(): Match[] {
  const base = {
    eventId: futbol18Event.id,
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled" as const,
    fixtureStatus: "draft_auto" as const,
    isFixturePreliminary: true
  };

  const p1 = `${futbol18Event.id}-p1`;
  const p2 = `${futbol18Event.id}-p2`;
  const c1 = `${futbol18Event.id}-c1`;
  const c2 = `${futbol18Event.id}-c2`;
  const c3 = `${futbol18Event.id}-c3`;
  const c4 = `${futbol18Event.id}-c4`;
  const s1 = `${futbol18Event.id}-s1`;
  const s2 = `${futbol18Event.id}-s2`;
  const third = `${futbol18Event.id}-3l`;
  const final = `${futbol18Event.id}-f`;

  return [
    {
      ...base,
      id: p1,
      round: 4,
      stage: "preliminary",
      bracketPosition: 1,
      label: "P1",
      homePlaceholder: "2do Grupo B",
      awayPlaceholder: "2do Grupo C",
      nextMatchId: c3
    },
    {
      ...base,
      id: p2,
      round: 4,
      stage: "preliminary",
      bracketPosition: 2,
      label: "P2",
      homePlaceholder: "2do Grupo D",
      awayPlaceholder: "2do Grupo E",
      nextMatchId: c4
    },
    {
      ...base,
      id: c1,
      round: 5,
      stage: "quarter_finals",
      bracketPosition: 1,
      label: "C1",
      homePlaceholder: "1ro Grupo B",
      awayPlaceholder: "2do Grupo A",
      nextMatchId: s1
    },
    {
      ...base,
      id: c2,
      round: 5,
      stage: "quarter_finals",
      bracketPosition: 2,
      label: "C2",
      homePlaceholder: "1ro Grupo C",
      awayPlaceholder: "1ro Grupo D",
      nextMatchId: s1
    },
    {
      ...base,
      id: c3,
      round: 5,
      stage: "quarter_finals",
      bracketPosition: 3,
      label: "C3",
      homePlaceholder: "1ro Grupo A",
      awayPlaceholder: "Ganador P1",
      awaySourceMatchId: p1,
      sourceMatchIds: [p1],
      dependsOnMatchIds: [p1],
      nextMatchId: s2
    },
    {
      ...base,
      id: c4,
      round: 5,
      stage: "quarter_finals",
      bracketPosition: 4,
      label: "C4",
      homePlaceholder: "1ro Grupo E",
      awayPlaceholder: "Ganador P2",
      awaySourceMatchId: p2,
      sourceMatchIds: [p2],
      dependsOnMatchIds: [p2],
      nextMatchId: s2
    },
    {
      ...base,
      id: s1,
      round: 6,
      stage: "semi_finals",
      bracketPosition: 1,
      label: "S1",
      homePlaceholder: "Ganador C1",
      awayPlaceholder: "Ganador C2",
      homeSourceMatchId: c1,
      awaySourceMatchId: c2,
      sourceMatchIds: [c1, c2],
      dependsOnMatchIds: [c1, c2],
      nextMatchId: final
    },
    {
      ...base,
      id: s2,
      round: 6,
      stage: "semi_finals",
      bracketPosition: 2,
      label: "S2",
      homePlaceholder: "Ganador C3",
      awayPlaceholder: "Ganador C4",
      homeSourceMatchId: c3,
      awaySourceMatchId: c4,
      sourceMatchIds: [c3, c4],
      dependsOnMatchIds: [c3, c4],
      nextMatchId: final
    },
    {
      ...base,
      id: third,
      round: 7,
      stage: "third_place",
      bracketPosition: 1,
      label: "3L",
      homePlaceholder: "Perdedor S1",
      awayPlaceholder: "Perdedor S2",
      homeSourceMatchId: s1,
      awaySourceMatchId: s2,
      sourceMatchIds: [s1, s2],
      dependsOnMatchIds: [s1, s2]
    },
    {
      ...base,
      id: final,
      round: 8,
      stage: "final",
      bracketPosition: 1,
      label: "F",
      homePlaceholder: "Ganador S1",
      awayPlaceholder: "Ganador S2",
      homeSourceMatchId: s1,
      awaySourceMatchId: s2,
      sourceMatchIds: [s1, s2],
      dependsOnMatchIds: [s1, s2]
    }
  ];
}

function createRegistrationCodes(teams: Team[]): RegistrationCode[] {
  return teams.map((team, index) => ({
    id: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeee${String(index + 1).padStart(2, "0")}`,
    eventId: futbol18Event.id,
    code: team.registrationCode,
    paymentMethod: team.paymentMethod,
    status: "used",
    usedByTeamId: team.id
  }));
}

function createBases(): TournamentBases {
  return {
    id: "bases-futbol-relampago-2026",
    championshipName: futbol18Event.name,
    year: 2026,
    organizer: "Comision deportiva universitaria",
    startDate: futbol18Event.eventDate ?? eventDate,
    endDate: futbol18Event.eventDate ?? eventDate,
    description:
      "Campeonato relampago de futbol con 18 equipos en 5 grupos y fase final de eliminacion directa.",
    matchDuration: 20,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakerRules:
      "En grupos: puntos, diferencia de goles, goles a favor, resultado directo y sorteo. En eliminatorias, empate se define por penales.",
    walkoverRules: "Tolerancia de 5 minutos. Ausencia del equipo implica W.O. y clasificacion del rival.",
    maxPlayersPerTeam: futbol18Event.maxPlayers,
    sanctions: "Tarjeta roja directa suspende al jugador para el siguiente partido.",
    published: true
  };
}
