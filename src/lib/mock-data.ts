import type { ParsedAudioResult } from "./types";
import { emptyCompetitionData } from "./data-mappers";
import { withRepositoryFootballDefaults } from "./football-content";

export const mockCompetitionData = withRepositoryFootballDefaults(emptyCompetitionData);

export const sports = mockCompetitionData.sports;
export const competitionFormats = mockCompetitionData.competitionFormats;
export const venues = mockCompetitionData.venues;
export const timeSlots = mockCompetitionData.timeSlots;
export const tournamentBases = mockCompetitionData.tournamentBases;
export const events = mockCompetitionData.events;
export const teams = mockCompetitionData.teams;
export const groups = mockCompetitionData.groups;
export const groupTeams = mockCompetitionData.groupTeams;
export const groupStandings = mockCompetitionData.groupStandings;
export const registrationCodes = mockCompetitionData.registrationCodes;
export const players = mockCompetitionData.players;
export const matches = mockCompetitionData.matches;
const firstMatch = matches[0];

export const parsedAudioExample: ParsedAudioResult = {
  eventId: events[0]?.id ?? "event-preview",
  matchId: firstMatch?.id ?? "match-preview",
  confidence: 0.91,
  rawTranscript:
    "Educacion Fisica gano por dos a uno a Contabilidad en la ronda preliminar.",
  homeTeamName: firstMatch?.homePlaceholder ?? teams[0]?.name ?? "Equipo A",
  awayTeamName: firstMatch?.awayPlaceholder ?? teams[1]?.name ?? "Equipo B",
  homeScore: 2,
  awayScore: 1,
  goals: [
    { teamName: "Educacion Fisica", playerName: "Adrian Apaza", minute: 8 },
    { teamName: "Contabilidad", playerName: "Bruno Benavides", minute: 11 },
    { teamName: "Educacion Fisica", playerName: "Cesar Castillo", minute: 18 }
  ],
  cards: [{ teamName: "Contabilidad", type: "yellow", minute: 16 }],
  notes: "Resultado de ejemplo para validacion de audio."
};
