"use client";

import type { TournamentEvent } from "@/lib/types";
import { championshipSlug, sportDisplayName } from "@/lib/domain/tournament-format";

export function ChampionshipSwitcher({
  events,
  value,
  onChange
}: {
  events: TournamentEvent[];
  value: string;
  onChange: (eventId: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-10 w-full min-w-0 rounded-md border border-white/25 bg-white px-3 py-2 text-sm font-bold text-brand-navy outline-none focus:ring-2 focus:ring-brand-yellow lg:w-auto"
      aria-label="Cambiar campeonato"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id}>
          {event.name} - {sportDisplayName(event)} ({championshipSlug(event)})
        </option>
      ))}
    </select>
  );
}
