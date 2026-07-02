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
      className="w-full rounded-md border border-brand-towerMid/25 bg-white p-4 text-left shadow-insetLine transition hover:-translate-y-0.5 hover:border-brand-electric/45 hover:shadow-lift focus:outline-none focus:ring-2 focus:ring-brand-electric/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{team.name}</p>
          <p className="mt-1 text-sm font-semibold text-brand-muted">{playerCount} jugadores</p>
        </div>
        <Badge tone={team.status === "approved" ? "green" : "amber"}>
          {teamStatusLabel(team.status)}
        </Badge>
      </div>
      <div className="mt-4 flex gap-1.5">
        <span
          className="h-4 w-8 rounded-sm border border-brand-towerMid/35"
          style={{ backgroundColor: team.primaryColor }}
        />
        <span
          className="h-4 w-8 rounded-sm border border-brand-towerMid/35"
          style={{ backgroundColor: team.secondaryColor }}
        />
      </div>
    </button>
  );
}
