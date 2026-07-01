import type { Match, Team, TournamentEvent, Venue } from "../types";
import { generateKnockoutBracket, type GeneratedBracket } from "./bracket-generator";
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

  const eventTeams = teams.filter((team) => team.eventId === event.id);
  const eventMatches = matches.filter((match) => match.eventId === event.id);
  const bracket = generateKnockoutBracket({
    eventId: event.id,
    teams: eventTeams,
    matches: eventMatches,
    thirdPlace: event.thirdPlace ?? true,
    seedingMode: event.seedingMode ?? "registration_order",
    fixtureStatus: event.fixtureStatus ?? "draft_auto"
  });
  const schedule =
    bracket.matches.length > 0
      ? generateOneDaySchedule(bracket.matches, {
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
    if (preview?.matches.length) {
      generatedByEvent.set(event.id, preview.matches);
    }
  }

  if (generatedByEvent.size === 0) return matches;

  const staticMatches = matches.filter((match) => !generatedByEvent.has(match.eventId));
  return [...staticMatches, ...Array.from(generatedByEvent.values()).flat()];
}

export function shouldBuildPreliminaryFixture(event: TournamentEvent) {
  return (
    event.format === "single_elimination" &&
    (event.fixtureStatus === undefined ||
      event.fixtureStatus === "draft_auto" ||
      event.fixtureStatus === "draft_review")
  );
}

function normalizedCourts(event: TournamentEvent, venues: Venue[]) {
  const configured = event.scheduleConfig?.courts?.filter(Boolean) ?? [];
  if (configured.length > 0) return configured;

  const venueNames = venues.map((venue) => venue.name).filter(Boolean);
  return venueNames.length > 0 ? venueNames : ["Cancha A"];
}
