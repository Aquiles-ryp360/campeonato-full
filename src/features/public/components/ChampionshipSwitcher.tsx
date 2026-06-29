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
      className="min-h-10 rounded-md border border-white/20 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-lime"
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
