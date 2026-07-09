import { addMinutes, differenceInMinutes } from "date-fns";
import type { Match } from "../types";
import type { ScheduleConflict } from "./conflict-detector";

export interface OneDayScheduleConfig {
  eventDate: string;
  startTime: string;
  matchDurationMinutes: number;
  transitionMinutes: number;
  courts: string[];
  minimumRestMinutes: number;
  respectRoundDependencies: boolean;
  allowCompactPreview: boolean;
}

export interface DayScheduleConfig {
  eventDate: string;
  startTime: string;
  endTime: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  venues: Array<{ id: string; name: string; active: boolean }>;
}

export interface DaySlot {
  id: string;
  venueId?: string;
  court: string;
  startsAt: string;
  endsAt: string;
}

export interface GeneratedSchedule {
  matches: Match[];
  warnings: ScheduleConflict[];
  slots: DaySlot[];
}

export function generateDaySlots(config: DayScheduleConfig): DaySlot[] {
  const slots: DaySlot[] = [];
  const datePart = config.eventDate.slice(0, 10);
  const start = parsePeruDateTime(datePart, config.startTime);
  const end = parsePeruDateTime(datePart, config.endTime);

  for (const venue of config.venues.filter((item) => item.active)) {
    let cursor = start;
    while (addMinutes(cursor, config.matchDurationMinutes).getTime() <= end.getTime()) {
      const slotEnd = addMinutes(cursor, config.matchDurationMinutes);
      slots.push({
        id: `${venue.id}-${peruTimeKey(cursor)}`,
        venueId: venue.id,
        court: venue.name,
        startsAt: cursor.toISOString(),
        endsAt: slotEnd.toISOString()
      });
      cursor = addMinutes(slotEnd, config.breakMinutes);
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.court.localeCompare(b.court));
}

export function generateOneDaySchedule(matches: Match[], config: OneDayScheduleConfig): GeneratedSchedule {
  const warnings: ScheduleConflict[] = [];
  const sortedMatches = [...matches].sort(matchSort);
  const scheduled: Match[] = [];
  const slots: DaySlot[] = [];
  const datePart = config.eventDate.slice(0, 10);
  let cursor = parsePeruDateTime(datePart, config.startTime);
  const matchesByRound = groupByRound(sortedMatches);

  for (const roundMatches of matchesByRound) {
    const roundStart = cursor;

    roundMatches.forEach((match, index) => {
      const court = config.courts[index % config.courts.length];
      const startsAt = addMinutes(
        roundStart,
        Math.floor(index / Math.max(1, config.courts.length)) *
          (config.matchDurationMinutes + config.transitionMinutes)
      );
      const endsAt = addMinutes(startsAt, config.matchDurationMinutes);
      slots.push({
        id: `${court}-${peruTimeKey(startsAt)}`,
        court,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString()
      });
      scheduled.push({
        ...match,
        scheduledAt: startsAt.toISOString(),
        scheduledEndAt: endsAt.toISOString(),
        court,
        venueId: court.toLowerCase().replace(/\s+/g, "-")
      });
    });

    const parallelGroups = Math.ceil(roundMatches.length / Math.max(1, config.courts.length));
    const roundDuration =
      parallelGroups * config.matchDurationMinutes +
      Math.max(0, parallelGroups - 1) * config.transitionMinutes;
    const dependencyGap =
      config.respectRoundDependencies && !config.allowCompactPreview
        ? Math.max(config.minimumRestMinutes, config.transitionMinutes)
        : config.transitionMinutes;
    cursor = addMinutes(roundStart, roundDuration + dependencyGap);
  }

  if (config.allowCompactPreview && config.minimumRestMinutes > config.matchDurationMinutes + config.transitionMinutes) {
    warnings.push({
      type: "fixture_preliminary",
      severity: "info",
      message: "Fixture preliminar compacto: los horarios sirven para maqueta y pueden cambiar al cerrar inscripciones.",
      affectedMatchIds: scheduled.map((match) => match.id),
      affectedTeamIds: [],
      affectedPlayerIds: [],
      suggestion: "Al publicar, desactiva modo compacto o ajusta el descanso minimo."
    });
  }

  warnings.push(...validateRoundDependencies(scheduled));

  return {
    matches: scheduled,
    warnings,
    slots
  };
}

export function previewSingleDaySchedule({
  matches,
  slots
}: {
  matches: Match[];
  slots: DaySlot[];
}) {
  const scheduled = matches.map((match, index) => {
    const slot = slots[index];
    if (!slot) return match;

    return {
      ...match,
      scheduledAt: slot.startsAt,
      scheduledEndAt: slot.endsAt,
      venueId: slot.venueId,
      court: slot.court
    };
  });

  return {
    matches: scheduled,
    unassignedCount: Math.max(0, matches.length - slots.length)
  };
}

function parsePeruDateTime(datePart: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const date = new Date(`${datePart}T${normalizedTime}-05:00`);
  if (!Number.isNaN(date.getTime())) return date;

  return new Date(`${datePart}T00:00:00-05:00`);
}

function peruTimeKey(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima"
  }).format(date).replace(":", "");
}

function groupByRound(matches: Match[]) {
  const rounds = new Map<number, Match[]>();
  for (const match of matches) {
    rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
  }
  return Array.from(rounds.entries())
    .sort(([a], [b]) => a - b)
    .map(([, roundMatches]) => roundMatches.sort(matchSort));
}

function matchSort(a: Match, b: Match) {
  return (
    a.round - b.round ||
    stageRank(a.stage) - stageRank(b.stage) ||
    (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0) ||
    a.id.localeCompare(b.id)
  );
}

function stageRank(stage: Match["stage"]) {
  const rank: Record<Match["stage"], number> = {
    group_stage: 0,
    preliminary: 1,
    round_of_16: 2,
    quarter_finals: 3,
    semi_finals: 4,
    final: 5,
    third_place: 6
  };

  return rank[stage];
}

function validateRoundDependencies(matches: Match[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const byId = new Map(matches.map((match) => [match.id, match]));

  for (const match of matches) {
    for (const dependencyId of match.dependsOnMatchIds ?? []) {
      const dependency = byId.get(dependencyId);
      if (!dependency?.scheduledAt || !match.scheduledAt) continue;

      const diff = differenceInMinutes(new Date(match.scheduledAt), new Date(dependency.scheduledAt));
      if (diff < 0) {
        conflicts.push({
          type: "phase",
          severity: "error",
          message: `${match.label ?? match.id} esta programado antes de su dependencia ${dependency.label ?? dependency.id}.`,
          affectedMatchIds: [dependency.id, match.id],
          affectedTeamIds: [],
          affectedPlayerIds: [],
          suggestion: "Reordena rondas o aumenta slots antes de publicar."
        });
      }
    }
  }

  return conflicts;
}
