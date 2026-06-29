import type { ParsedAudioResult } from "./types";
import { buildFutsal10Seed } from "./futsal-10-seed";

export const mockCompetitionData = buildFutsal10Seed();

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

export const parsedAudioExample: ParsedAudioResult = {
  eventId: events[0].id,
  matchId: matches[0].id,
  confidence: 0.91,
  rawTranscript:
    "Educacion Fisica gano por dos a uno a Contabilidad en la ronda preliminar.",
  homeTeamName: matches[0].homePlaceholder ?? "Educacion Fisica",
  awayTeamName: matches[0].awayPlaceholder ?? "Contabilidad",
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
