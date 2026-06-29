import { addMinutes, format, parse } from "date-fns";
import type { Match, Venue } from "../types";
import { detectScheduleConflicts } from "./conflict-detector";

export interface DayScheduleConfig {
  eventDate: string;
  startTime: string;
  endTime: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  venues: Venue[];
}

export interface DaySlot {
  id: string;
  venueId: string;
  court: string;
  startsAt: string;
  endsAt: string;
}

export function generateDaySlots(config: DayScheduleConfig): DaySlot[] {
  const slots: DaySlot[] = [];
  const datePart = config.eventDate.slice(0, 10);
  const start = parse(`${datePart} ${config.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = parse(`${datePart} ${config.endTime}`, "yyyy-MM-dd HH:mm", new Date());

  for (const venue of config.venues.filter((item) => item.active)) {
    let cursor = start;
    while (addMinutes(cursor, config.matchDurationMinutes).getTime() <= end.getTime()) {
      const slotEnd = addMinutes(cursor, config.matchDurationMinutes);
      slots.push({
        id: `${venue.id}-${format(cursor, "HHmm")}`,
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
      venueId: slot.venueId,
      court: slot.court
    };
  });

  return {
    matches: scheduled,
    unassignedCount: Math.max(0, matches.length - slots.length),
    detectScheduleConflicts
  };
}
