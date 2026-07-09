import type { Match, Team, TournamentEvent, Venue } from "../types";
import { generateKnockoutBracket, type GeneratedBracket } from "./bracket-generator";
import { isActiveRegistrationTeamStatus } from "./registration-rules";
import { generateOneDaySchedule, type GeneratedSchedule } from "./schedule-generator";

type PreviewInput = {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
  venues: Venue[];
};

export type EventFixturePreview = {
  bracket: GeneratedBracket;
  schedule: GeneratedSchedule | null;
  teams: Team[];
  matches: Match[];
};

export function buildEventFixturePreview({
  event,
  teams,
  matches,
  venues
}: PreviewInput): EventFixturePreview | null {
  if (!shouldBuildPreliminaryFixture(event)) return null;

  const eventTeams = getEventFixtureTeams(event, teams);
  const eventMatches = matches.filter((match) => match.eventId === event.id);
  const bracket = generateKnockoutBracket({
    eventId: event.id,
    teams: eventTeams,
    matches: eventMatches,
    thirdPlace: event.thirdPlace ?? true,
    maxTeams: event.maxTeams,
    allowByes: event.allowByes ?? true,
    seedingMode: event.seedingMode ?? "registration_order",
    randomSeed: buildFixtureRandomSeed(event, eventTeams),
    fixtureStatus: event.fixtureStatus ?? "draft_auto"
  });
  const schedule =
    bracket.matches.length > 0
      ? generateOneDaySchedule([...bracket.matches, ...exhibitionMatchesForSchedule(eventMatches, bracket.matches)], {
          eventDate: event.eventDate ?? eventMatches[0]?.scheduledAt ?? new Date().toISOString(),
          startTime: event.scheduleConfig?.startTime ?? "09:00",
          matchDurationMinutes: event.scheduleConfig?.matchDurationMinutes ?? 20,
          transitionMinutes: event.scheduleConfig?.transitionMinutes ?? 10,
          courts: normalizedCourts(event, venues),
          minimumRestMinutes: event.minimumRestMinutes,
          respectRoundDependencies: true,
          allowCompactPreview: event.fixtureCompactPreview ?? true
        })
      : null;

  return {
    bracket,
    schedule,
    teams: eventTeams,
    matches: schedule?.matches ?? bracket.matches
  };
}

export function getEventFixtureTeams(event: Pick<TournamentEvent, "id">, teams: Team[]) {
  return teams.filter((team) => team.eventId === event.id && isActiveRegistrationTeamStatus(team.status));
}

export function buildFixtureRandomSeed(
  event: Pick<TournamentEvent, "id" | "eventDate" | "registrationOpenUntil">,
  teams: Team[]
) {
  const teamFingerprint = teams
    .map((team) => `${team.id}:${team.createdAt ?? ""}`)
    .sort()
    .join("|");

  return [
    event.id,
    event.eventDate ?? "",
    event.registrationOpenUntil ?? "",
    teamFingerprint
  ].join("::");
}

export function buildVisibleFixtureMatches({
  events,
  teams,
  matches,
  venues
}: {
  events: TournamentEvent[];
  teams: Team[];
  matches: Match[];
  venues: Venue[];
}) {
  const generatedByEvent = new Map<string, Match[]>();

  for (const event of events) {
    const preview = buildEventFixturePreview({ event, teams, matches, venues });
    if (preview) {
      generatedByEvent.set(event.id, preview.matches);
    }
  }

  if (generatedByEvent.size === 0) return matches;

  const staticMatches = matches.filter(
    (match) => !generatedByEvent.has(match.eventId)
  );
  return [...staticMatches, ...Array.from(generatedByEvent.values()).flat()];
}

export function shouldBuildPreliminaryFixture(event: TournamentEvent) {
  return (
    event.format === "single_elimination" &&
    event.fixtureStatus !== "locked"
  );
}

function isExhibitionMatch(match: Match) {
  const text = `${match.label ?? ""} ${match.notes ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return text.includes("exhibicion") || match.label === "EX";
}

function exhibitionMatchesForSchedule(eventMatches: Match[], bracketMatches: Match[]) {
  const semifinalRound = bracketMatches.find((match) => match.stage === "semi_finals")?.round;
  const fallbackRound = Math.max(1, ...bracketMatches.map((match) => match.round));
  const round = semifinalRound ?? fallbackRound;

  return eventMatches
    .filter(isExhibitionMatch)
    .map((match, index) => ({
      ...match,
      round,
      stage: "group_stage" as const,
      bracketPosition: index,
      homeSourceMatchId: undefined,
      awaySourceMatchId: undefined,
      sourceMatchIds: [],
      dependsOnMatchIds: []
    }));
}

function normalizedCourts(event: TournamentEvent, venues: Venue[]) {
  const configured = event.scheduleConfig?.courts?.filter(Boolean) ?? [];
  if (configured.length > 0) return configured;

  const venueNames = venues.map((venue) => venue.name).filter(Boolean);
  return venueNames.length > 0 ? venueNames : ["Cancha A"];
}
