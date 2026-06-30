import type { CompetitionData } from "./data-mappers";
import type { Category, Match, Team, TournamentBases, TournamentEvent, Venue } from "./types";

export const footballEventId = "11111111-1111-4111-8111-111111111111";
export const footballVenueId = "22222222-2222-4222-8222-222222222222";

export const footballBases: TournamentBases = {
  id: "bases-futbol-2026",
  championshipName: "Campeonato Futbol 11 Varones Intercarreras 2026",
  year: 2026,
  organizer: "Comision deportiva de Mecanica Electrica",
  startDate: "2026-07-20T15:00:00-05:00",
  endDate: "2026-08-30T18:00:00-05:00",
  description:
    "Torneo de futbol 11 con formato de eliminacion directa. Los equipos inscritos entran a sorteo publico administrado desde el panel admin; despues del sorteo, las llaves quedan visibles para delegados y publico.",
  matchDuration: 90,
  pointsWin: 0,
  pointsDraw: 0,
  pointsLoss: 0,
  tiebreakerRules:
    "Si un partido termina empatado, se definira directamente por penales. El orden de penales sera comunicado por mesa antes del inicio del encuentro.",
  walkoverRules:
    "La tolerancia maxima es de 10 minutos desde la hora programada. El equipo ausente pierde por W.O.; el rival avanza automaticamente a la siguiente ronda.",
  maxPlayersPerTeam: 18,
  sanctions:
    "Una tarjeta roja directa suspende al jugador por una fecha. Agresion fisica, suplantacion o conducta antideportiva grave puede eliminar al equipo por decision de la comision.",
  published: true,
  updatedAt: "2026-06-28T00:00:00-05:00"
};

export const footballRules = [
  "Formato: eliminacion directa desde la primera ronda.",
  "Cada equipo puede inscribir hasta 18 jugadores.",
  "Cada partido dura 90 minutos, dividido en dos tiempos de 45 minutos.",
  "No hay prorroga: empate al final del tiempo reglamentario se define por penales.",
  "El sorteo de llaves lo realiza el administrador desde el panel admin.",
  "Despues del sorteo, las llaves se publican con nombres de equipos en la vista publica."
];

export const footballEvent: TournamentEvent = {
  id: footballEventId,
  name: "Campeonato Futbol 11 Varones",
  sportId: "sport-futbol",
  sport: "futbol",
  category: "Varones",
  formatId: "format-knockout",
  format: "single_elimination",
  status: "registration",
  registrationFee: 40,
  registrationOpenUntil: "2026-07-18T23:59:00-05:00",
  maxTeams: 8,
  minPlayers: 11,
  maxPlayers: 18,
  pointsWin: 0,
  pointsDraw: 0,
  pointsLoss: 0,
  rulesSummary: "Eliminacion directa. Empates por penales. Sorteo admin antes de publicar llaves.",
  preventCrossSportConflicts: true,
  minimumRestMinutes: 120
};

export const footballVenue: Venue = {
  id: footballVenueId,
  name: "Campo Futbol 11 Principal",
  location: "Estadio del campus",
  active: true
};

export const footballCategories: Category[] = [
  {
    id: "category-football-varones",
    eventId: footballEventId,
    name: "Varones",
    slug: "varones",
    description: "Categoria principal de futbol 11.",
    published: true,
    active: true,
    sortOrder: 1
  }
];

export const footballTeams: Team[] = [
  createFootballTeam("33333333-3333-4333-8333-333333333331", "Sistemas FC", "Ingenieria de Sistemas", "#2563eb"),
  createFootballTeam("33333333-3333-4333-8333-333333333332", "Industrial United", "Ingenieria Industrial", "#dc2626"),
  createFootballTeam("33333333-3333-4333-8333-333333333333", "Civil Club", "Ingenieria Civil", "#16a34a"),
  createFootballTeam("33333333-3333-4333-8333-333333333334", "Minas FC", "Ingenieria de Minas", "#7c3aed"),
  createFootballTeam("33333333-3333-4333-8333-333333333335", "Electrica 11", "Ingenieria Electrica", "#0f766e"),
  createFootballTeam("33333333-3333-4333-8333-333333333336", "Mecanica Power", "Ingenieria Mecanica", "#ea580c"),
  createFootballTeam("33333333-3333-4333-8333-333333333337", "Arquitectura FC", "Arquitectura", "#be123c"),
  createFootballTeam("33333333-3333-4333-8333-333333333338", "Agro Champions", "Ingenieria Agroindustrial", "#65a30d")
];

export const footballDrawOrder = [
  "33333333-3333-4333-8333-333333333331",
  "33333333-3333-4333-8333-333333333336",
  "33333333-3333-4333-8333-333333333334",
  "33333333-3333-4333-8333-333333333337",
  "33333333-3333-4333-8333-333333333332",
  "33333333-3333-4333-8333-333333333335",
  "33333333-3333-4333-8333-333333333333",
  "33333333-3333-4333-8333-333333333338"
];

export function withRepositoryFootballDefaults(data: CompetitionData): CompetitionData {
  const event =
    data.events.find((current) => current.id === footballEventId) ??
    data.events.find((current) => current.sport === "futbol" && current.format === "single_elimination") ??
    footballEvent;
  const hasFootballEvent = data.events.some((current) => current.id === event.id);
  const teams = data.teams.filter((team) => team.eventId === event.id);
  const fallbackTeams = footballTeams.map((team) => ({ ...team, eventId: event.id }));
  const hasFootballVenue = data.venues.some((venue) => venue.id === footballVenue.id);
  return {
    ...data,
    events: hasFootballEvent ? data.events : [...data.events, event],
    teams: teams.length > 0 ? data.teams : [...data.teams, ...fallbackTeams],
    matches: data.matches,
    categories: data.categories.length > 0 ? data.categories : footballCategories,
    venues: hasFootballVenue ? data.venues : [...data.venues, footballVenue],
    tournamentBases: data.tournamentBases.some((base) => base.id === footballBases.id)
      ? data.tournamentBases
      : [...data.tournamentBases, footballBases]
  };
}

export function createFootballPreviewMatches(eventId: string, teams: Team[]): Match[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const orderedTeams = [
    ...footballDrawOrder
      .map((teamId) => teamsById.get(teamId))
      .filter((team): team is Team => Boolean(team)),
    ...teams.filter((team) => !footballDrawOrder.includes(team.id))
  ];

  return createFootballMatches(eventId, orderedTeams);
}

export function createFootballMatches(eventId: string, orderedTeams: Team[]): Match[] {
  const stage = stageForTeamCount(orderedTeams.length);
  const pairCount = Math.floor(orderedTeams.length / 2);

  return Array.from({ length: pairCount }, (_, index) => {
    const homeTeam = orderedTeams[index * 2];
    const awayTeam = orderedTeams[index * 2 + 1];

    return {
      id: `football-draw-${index + 1}`,
      eventId,
      round: 1,
      stage,
      bracketPosition: index + 1,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      scheduledAt: nextFootballSlot(index),
      venueId: footballVenueId,
      court: footballVenue.name,
      status: "scheduled",
      notes: "Llave generada por sorteo de futbol."
    };
  });
}

export function stageForTeamCount(teamCount: number): Match["stage"] {
  if (teamCount > 8) return "round_of_16";
  if (teamCount > 4) return "quarter_finals";
  if (teamCount > 2) return "semi_finals";
  return "final";
}

function createFootballTeam(id: string, name: string, career: string, color: string): Team {
  return {
    id,
    eventId: footballEventId,
    categoryId: footballCategories[0].id,
    name,
    delegateName: "Delegado por confirmar",
    delegatePhone: "000 000 000",
    delegateEmail: "delegado@campeonato.local",
    academicCareer: career,
    paymentMethod: "yape",
    registrationCode: "FUTBOL-GH",
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc"
  };
}

function nextFootballSlot(index: number) {
  const base = new Date("2026-07-20T15:00:00-05:00");
  base.setDate(base.getDate() + index);
  return base.toISOString();
}
