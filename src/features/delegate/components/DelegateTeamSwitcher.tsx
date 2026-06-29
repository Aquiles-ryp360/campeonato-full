"use client";

import type { Team, TournamentEvent } from "@/lib/types";

export function DelegateTeamSwitcher({
  teams,
  events,
  value,
  onChange
}: {
  teams: Team[];
  events: TournamentEvent[];
  value?: string;
  onChange: (teamId: string) => void;
}) {
  if (teams.length <= 1) return null;

  return (
    <select
      className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-field/20"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Cambiar equipo delegado"
    >
      {teams.map((team) => {
        const event = events.find((item) => item.id === team.eventId);
        return (
          <option key={team.id} value={team.id}>
            {team.name} - {event?.name ?? "Campeonato"}
          </option>
        );
      })}
    </select>
  );
}
