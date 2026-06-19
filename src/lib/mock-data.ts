import type {
  Match,
  ParsedAudioResult,
  Player,
  RegistrationCode,
  Team,
  TournamentEvent
} from "./types";

export const events: TournamentEvent[] = [
  {
    id: "futsal-2026",
    name: "Campeonato Futsal Varones",
    sport: "futsal",
    category: "Varones",
    format: "league",
    status: "in_progress",
    registrationFee: 40,
    registrationOpenUntil: "2026-07-05T23:59:00-05:00",
    maxTeams: 12,
    minPlayers: 6,
    maxPlayers: 12,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    rulesSummary: "Todos contra todos. Clasifican los cuatro mejores a semifinal."
  },
  {
    id: "voley-2026",
    name: "Campeonato Voley Mixto",
    sport: "voley",
    category: "Mixto",
    format: "groups_then_knockout",
    status: "registration",
    registrationFee: 40,
    registrationOpenUntil: "2026-07-10T23:59:00-05:00",
    maxTeams: 10,
    minPlayers: 6,
    maxPlayers: 10,
    pointsWin: 2,
    pointsDraw: 0,
    pointsLoss: 0,
    rulesSummary: "Dos grupos. Pasan los dos mejores de cada grupo."
  },
  {
    id: "futsal-damas-2026",
    name: "Campeonato Futsal Damas",
    sport: "futsal",
    category: "Damas",
    format: "single_elimination",
    status: "registration",
    registrationFee: 40,
    registrationOpenUntil: "2026-08-01T23:59:00-05:00",
    maxTeams: 8,
    minPlayers: 5,
    maxPlayers: 10,
    pointsWin: 0,
    pointsDraw: 0,
    pointsLoss: 0,
    rulesSummary: "Eliminacion directa con penales si empatan."
  },
  {
    id: "futsal-mixto-2026",
    name: "Campeonato Futsal Mixto",
    sport: "futsal",
    category: "Mixto",
    format: "groups_then_knockout",
    status: "draft",
    registrationFee: 40,
    registrationOpenUntil: "2026-08-04T23:59:00-05:00",
    maxTeams: 8,
    minPlayers: 6,
    maxPlayers: 12,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    rulesSummary: "Grupos por sorteo y llaves finales."
  }
];

export const teams: Team[] = [
  {
    id: "team-russkaya",
    eventId: "futsal-2026",
    name: "Russkaya",
    delegateName: "Renzo Vilca",
    delegatePhone: "999 101 202",
    paymentMethod: "yape",
    registrationCode: "FUT-VAR-001",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#e23b3b",
    secondaryColor: "#111827"
  },
  {
    id: "team-octavo",
    eventId: "futsal-2026",
    name: "8vo Semestre",
    delegateName: "Maria Rojas",
    delegatePhone: "998 331 200",
    paymentMethod: "plin",
    registrationCode: "FUT-VAR-002",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#2563eb",
    secondaryColor: "#f8fafc"
  },
  {
    id: "team-los-cracks",
    eventId: "futsal-2026",
    name: "Los Cracks",
    delegateName: "Luis Paredes",
    delegatePhone: "987 231 555",
    paymentMethod: "yape",
    registrationCode: "FUT-VAR-003",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#16a34a",
    secondaryColor: "#facc15"
  },
  {
    id: "team-beta",
    eventId: "futsal-2026",
    name: "Beta FC",
    delegateName: "Ana Huaman",
    delegatePhone: "955 441 020",
    paymentMethod: "yape",
    registrationCode: "FUT-VAR-004",
    paymentStatus: "pending",
    status: "registered",
    primaryColor: "#7c3aed",
    secondaryColor: "#f5f3ff"
  },
  {
    id: "team-mixtos",
    eventId: "voley-2026",
    name: "Mixtos de Base",
    delegateName: "Paola Ccasa",
    delegatePhone: "944 090 101",
    paymentMethod: "yape",
    registrationCode: "VOL-MIX-001",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#0891b2",
    secondaryColor: "#ecfeff"
  }
];

export const registrationCodes: RegistrationCode[] = [
  {
    id: "code-1",
    eventId: "futsal-2026",
    code: "FUT-VAR-001",
    paymentMethod: "yape",
    status: "used",
    usedByTeamId: "team-russkaya"
  },
  {
    id: "code-2",
    eventId: "futsal-2026",
    code: "FUT-VAR-002",
    paymentMethod: "plin",
    status: "used",
    usedByTeamId: "team-octavo"
  },
  {
    id: "code-3",
    eventId: "futsal-2026",
    code: "FUT-VAR-003",
    paymentMethod: "yape",
    status: "used",
    usedByTeamId: "team-los-cracks"
  },
  {
    id: "code-4",
    eventId: "futsal-2026",
    code: "FUT-VAR-004",
    paymentMethod: "yape",
    status: "used",
    usedByTeamId: "team-beta"
  },
  {
    id: "code-5",
    eventId: "futsal-2026",
    code: "FUT-VAR-005",
    paymentMethod: "yape",
    status: "available"
  },
  {
    id: "code-6",
    eventId: "voley-2026",
    code: "VOL-MIX-001",
    paymentMethod: "yape",
    status: "used",
    usedByTeamId: "team-mixtos"
  },
  {
    id: "code-7",
    eventId: "voley-2026",
    code: "VOL-MIX-002",
    paymentMethod: "yape",
    status: "available"
  }
];

export const players: Player[] = [
  {
    id: "p-1",
    teamId: "team-russkaya",
    firstName: "Ivan",
    lastName: "Quispe",
    dni: "74561230",
    studentCode: "20221021",
    enrollmentFile: "FM-2026-001",
    semester: "8vo",
    lineupRole: "starter"
  },
  {
    id: "p-2",
    teamId: "team-russkaya",
    firstName: "Marco",
    lastName: "Flores",
    dni: "73440119",
    studentCode: "20211045",
    enrollmentFile: "FM-2026-002",
    semester: "9no",
    lineupRole: "starter"
  },
  {
    id: "p-3",
    teamId: "team-octavo",
    firstName: "Diego",
    lastName: "Mamani",
    dni: "70221245",
    studentCode: "20212008",
    enrollmentFile: "FM-2026-011",
    semester: "8vo",
    lineupRole: "substitute"
  }
];

export const matches: Match[] = [
  {
    id: "match-1",
    eventId: "futsal-2026",
    round: 1,
    homeTeamId: "team-russkaya",
    awayTeamId: "team-octavo",
    scheduledAt: "2026-06-22T18:00:00-05:00",
    court: "Losa principal",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
    homeFouls: 4,
    awayFouls: 6,
    notes: "Partido intenso, definido en los ultimos minutos."
  },
  {
    id: "match-2",
    eventId: "futsal-2026",
    round: 1,
    homeTeamId: "team-los-cracks",
    awayTeamId: "team-beta",
    scheduledAt: "2026-06-22T19:00:00-05:00",
    court: "Losa principal",
    status: "scheduled",
    notes: "Revisar disponibilidad de Los Cracks antes de confirmar."
  },
  {
    id: "match-3",
    eventId: "futsal-2026",
    round: 2,
    homeTeamId: "team-russkaya",
    awayTeamId: "team-los-cracks",
    scheduledAt: "2026-06-24T18:30:00-05:00",
    court: "Coliseo",
    status: "scheduled",
    notes: "Posible cruce de horario si Russkaya clasifica a repechaje de voley."
  },
  {
    id: "match-4",
    eventId: "voley-2026",
    round: 1,
    homeTeamId: "team-mixtos",
    awayTeamId: "team-beta",
    scheduledAt: "2026-07-12T16:00:00-05:00",
    court: "Coliseo",
    status: "scheduled"
  }
];

export const parsedAudioExample: ParsedAudioResult = {
  eventId: "futsal-2026",
  matchId: "match-1",
  confidence: 0.91,
  rawTranscript:
    "Gano Russkaya contra 8vo Semestre dos a uno. Goles de Ivan Quispe al minuto 12 y Marco Flores al 31. Para 8vo marco Diego Mamani al 18. Hubo amarilla para Russkaya en el minuto 25.",
  homeTeamName: "Russkaya",
  awayTeamName: "8vo Semestre",
  homeScore: 2,
  awayScore: 1,
  goals: [
    { teamName: "Russkaya", playerName: "Ivan Quispe", minute: 12 },
    { teamName: "8vo Semestre", playerName: "Diego Mamani", minute: 18 },
    { teamName: "Russkaya", playerName: "Marco Flores", minute: 31 }
  ],
  cards: [{ teamName: "Russkaya", type: "yellow", minute: 25 }],
  notes: "Resultado listo para revision. El modelo no encontro nombre del jugador amonestado."
};
