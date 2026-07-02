"use client";

import type { BracketSlot } from "@/lib/domain/bracket-generator";
import type { Team } from "@/lib/types";

export function ThirdPlaceMatch({
  slot,
  teams,
  onOpenTeam
}: {
  slot?: BracketSlot;
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  if (!slot) return null;

  return (
    <div className="rounded-md border border-brand-yellow/60 bg-brand-yellow/20 p-4 text-brand-navy">
      <p className="text-xs font-black uppercase">Tercer lugar</p>
      <div className="mt-3 space-y-2">
        <BracketTeamButton teamId={slot.homeTeamId} fallback={slot.homeLabel} teams={teams} onOpenTeam={onOpenTeam} />
        <BracketTeamButton teamId={slot.awayTeamId} fallback={slot.awayLabel} teams={teams} onOpenTeam={onOpenTeam} />
      </div>
    </div>
  );
}

function BracketTeamButton({
  teamId,
  fallback,
  teams,
  onOpenTeam
}: {
  teamId?: string;
  fallback: string;
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  const team = teams.find((item) => item.id === teamId);
  if (!team) return <p className="rounded bg-white px-3 py-2 text-sm font-semibold text-brand-muted">{fallback}</p>;

  return (
    <button
      type="button"
      onClick={() => onOpenTeam?.(team)}
      className="flex w-full items-center gap-2 rounded bg-white px-3 py-2 text-left text-sm font-semibold text-ink hover:text-brand-electric"
    >
      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
      {team.name}
    </button>
  );
}
