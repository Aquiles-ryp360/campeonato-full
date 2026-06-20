import type {
  Match,
  ParsedAudioResult,
  Player,
  RegistrationCode,
  Team,
  TournamentEvent,
  Sport,
  CompetitionFormat,
  TournamentBases,
  Venue,
  TimeSlot,
  Group,
  GroupTeam,
  GroupStanding
} from "./types";

export const sports: Sport[] = [
  { id: "sport-futsal", name: "Futsal", playersPerTeam: 5, matchDuration: 40, active: true },
  { id: "sport-voley", name: "Vóley", playersPerTeam: 6, matchDuration: 45, active: true },
  { id: "sport-futbol", name: "Fútbol 11", playersPerTeam: 11, matchDuration: 90, active: true }
];

export const competitionFormats: CompetitionFormat[] = [
  { id: "format-league", name: "Liga (Todos contra todos)", key: "league", description: "Todos contra todos", active: true },
  { id: "format-groups", name: "Fase de Grupos + Eliminación", key: "groups_then_knockout", description: "Grupos y playoffs", active: true },
  { id: "format-knockout", name: "Eliminación Directa", key: "single_elimination", description: "Llave de playoffs", active: true }
];

export const venues: Venue[] = [
  { id: "venue-losa", name: "Cancha Futsal Losa principal", location: "Losa Deportiva Principal", active: true },
  { id: "venue-coliseo", name: "Cancha Vóley Coliseo", location: "Coliseo Cerrado", active: true },
  { id: "venue-futbol", name: "Campo Fútbol 11 Principal", location: "Estadio del Campus", active: true }
];

export const timeSlots: TimeSlot[] = [
  { id: "slot-1", dayOfWeek: 6, startTime: "08:00", endTime: "09:30", active: true },
  { id: "slot-2", dayOfWeek: 6, startTime: "09:30", endTime: "11:00", active: true },
  { id: "slot-3", dayOfWeek: 6, startTime: "11:00", endTime: "12:30", active: true },
  { id: "slot-4", dayOfWeek: 6, startTime: "14:00", endTime: "15:30", active: true },
  { id: "slot-5", dayOfWeek: 0, startTime: "09:00", endTime: "10:30", active: true },
  { id: "slot-6", dayOfWeek: 0, startTime: "10:30", endTime: "12:00", active: true }
];

export const tournamentBases: TournamentBases[] = [
  {
    id: "base-2026",
    championshipName: "Intercarreras Universitarias 2026",
    year: 2026,
    organizer: "Bienestar Universitario",
    startDate: "2026-06-22T00:00:00Z",
    endDate: "2026-08-30T00:00:00Z",
    description: "Bases oficiales del campeonato universitario que integra a todas las carreras profesionales de la institución.",
    matchDuration: 40,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakerRules: "Diferencia de goles, goles a favor, resultado de partido directo.",
    walkoverRules: "Tolerancia de 10 minutos. El equipo ausente pierde por W.O. con score 0-3 y se le descuenta 1 punto.",
    maxPlayersPerTeam: 12,
    sanctions: "Tarjeta roja directa conlleva 1 partido de suspensión. Acumulación de 2 amarillas conlleva 1 partido de suspensión.",
    published: true
  }
];

export const events: TournamentEvent[] = [
  {
    id: "futsal-2026",
    name: "Campeonato Futsal Varones",
    sportId: "sport-futsal",
    category: "Varones",
    formatId: "format-league",
    status: "in_progress",
    registrationFee: 40,
    registrationOpenUntil: "2026-07-05T23:59:00-05:00",
    maxTeams: 12,
    minPlayers: 6,
    maxPlayers: 12,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    rulesSummary: "Todos contra todos. Clasifican los cuatro mejores a semifinal.",
    preventCrossSportConflicts: true,
    minimumRestMinutes: 60
  },
  {
    id: "voley-2026",
    name: "Campeonato Voley Mixto",
    sportId: "sport-voley",
    category: "Mixto",
    formatId: "format-groups",
    status: "registration",
    registrationFee: 40,
    registrationOpenUntil: "2026-07-10T23:59:00-05:00",
    maxTeams: 10,
    minPlayers: 6,
    maxPlayers: 10,
    pointsWin: 2,
    pointsDraw: 0,
    pointsLoss: 0,
    rulesSummary: "Dos grupos. Pasan los dos mejores de cada grupo.",
    preventCrossSportConflicts: true,
    minimumRestMinutes: 60
  },
  {
    id: "futsal-damas-2026",
    name: "Campeonato Futsal Damas",
    sportId: "sport-futsal",
    category: "Damas",
    formatId: "format-knockout",
    status: "registration",
    registrationFee: 40,
    registrationOpenUntil: "2026-08-01T23:59:00-05:00",
    maxTeams: 8,
    minPlayers: 5,
    maxPlayers: 10,
    pointsWin: 0,
    pointsDraw: 0,
    pointsLoss: 0,
    rulesSummary: "Eliminacion directa con penales si empatan.",
    preventCrossSportConflicts: false,
    minimumRestMinutes: 60
  }
];

export const teams: Team[] = [
  {
    id: "team-russkaya",
    eventId: "futsal-2026",
    name: "Sistemas FC",
    delegateName: "Renzo Vilca",
    delegatePhone: "999 101 202",
    delegateEmail: "renzo.vilca@instituto.edu.pe",
    academicCareer: "Ingeniería de Sistemas",
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
    name: "Industrial FC",
    delegateName: "Maria Rojas",
    delegatePhone: "998 331 200",
    delegateEmail: "maria.rojas@instituto.edu.pe",
    academicCareer: "Ingeniería Industrial",
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
    name: "Civil FC",
    delegateName: "Luis Paredes",
    delegatePhone: "987 231 555",
    delegateEmail: "luis.paredes@instituto.edu.pe",
    academicCareer: "Ingeniería Civil",
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
    name: "Minas FC",
    delegateName: "Ana Huaman",
    delegatePhone: "955 441 020",
    delegateEmail: "ana.huaman@instituto.edu.pe",
    academicCareer: "Ingeniería de Minas",
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
    name: "Voley Sistemas",
    delegateName: "Paola Ccasa",
    delegatePhone: "944 090 101",
    delegateEmail: "paola.ccasa@instituto.edu.pe",
    academicCareer: "Ingeniería de Sistemas",
    paymentMethod: "yape",
    registrationCode: "VOL-MIX-001",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: "#0891b2",
    secondaryColor: "#ecfeff"
  }
];

export const groups: Group[] = [
  { id: "group-a", eventId: "voley-2026", name: "Grupo A" },
  { id: "group-b", eventId: "voley-2026", name: "Grupo B" }
];

export const groupTeams: GroupTeam[] = [
  { id: "gt-1", groupId: "group-a", teamId: "team-mixtos" },
  { id: "gt-2", groupId: "group-a", teamId: "team-beta" }
];

export const groupStandings: GroupStanding[] = [
  { id: "gs-1", groupId: "group-a", teamId: "team-mixtos", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
  { id: "gs-2", groupId: "group-a", teamId: "team-beta", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
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
    stage: "group_stage",
    homeTeamId: "team-russkaya",
    awayTeamId: "team-octavo",
    scheduledAt: "2026-06-22T18:00:00-05:00",
    venueId: "venue-losa",
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
    stage: "group_stage",
    homeTeamId: "team-los-cracks",
    awayTeamId: "team-beta",
    scheduledAt: "2026-06-22T19:00:00-05:00",
    venueId: "venue-losa",
    status: "scheduled",
    notes: "Revisar disponibilidad de Los Cracks antes de confirmar."
  },
  {
    id: "match-3",
    eventId: "futsal-2026",
    round: 2,
    stage: "group_stage",
    homeTeamId: "team-russkaya",
    awayTeamId: "team-los-cracks",
    scheduledAt: "2026-06-24T18:30:00-05:00",
    venueId: "venue-losa",
    status: "scheduled",
    notes: "Posible cruce de horario."
  },
  {
    id: "match-4",
    eventId: "voley-2026",
    round: 1,
    stage: "group_stage",
    homeTeamId: "team-mixtos",
    awayTeamId: "team-beta",
    scheduledAt: "2026-07-12T16:00:00-05:00",
    venueId: "venue-coliseo",
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
