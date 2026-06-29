"use client";

import type { Team } from "@/lib/types";
import { teamStatusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function TeamCard({
  team,
  playerCount,
  onOpen
}: {
  team: Team;
  playerCount: number;
  onOpen: (team: Team) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(team)}
      className="w-full rounded-md border border-ink/10 bg-white p-4 text-left transition hover:border-field focus:outline-none focus:ring-2 focus:ring-field/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{team.name}</p>
          <p className="mt-1 text-sm text-ink/55">{playerCount} jugadores</p>
        </div>
        <Badge tone={team.status === "approved" ? "green" : "amber"}>
          {teamStatusLabel(team.status)}
        </Badge>
      </div>
      <div className="mt-4 flex gap-1.5">
        <span
          className="h-4 w-8 rounded-sm border border-ink/10"
          style={{ backgroundColor: team.primaryColor }}
        />
        <span
          className="h-4 w-8 rounded-sm border border-ink/10"
          style={{ backgroundColor: team.secondaryColor }}
        />
      </div>
    </button>
  );
}
