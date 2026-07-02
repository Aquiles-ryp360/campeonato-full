"use client";

import { X } from "lucide-react";
import type { Match, Player, Team, TournamentEvent } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { formatDateTime, getMatchSideLabel, teamStatusLabel } from "@/lib/utils";
import { DelegateInfo } from "@/features/teams/components/DelegateInfo";
import { TeamRoster } from "@/features/teams/components/TeamRoster";

export function TeamDetailsModal({
  team,
  event,
  players,
  matches,
  teams,
  onClose
}: {
  team: Team | null;
  event: TournamentEvent | null;
  players: Player[];
  matches: Match[];
  teams: Team[];
  onClose: () => void;
}) {
  if (!team || !event) return null;

  const nextMatch = matches
    .filter(
      (match) =>
        match.status === "scheduled" &&
        (match.homeTeamId === team.id || match.awayTeamId === team.id)
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-lg bg-white shadow-panel sm:rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b border-brand-towerMid/20 p-5">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={team.status === "approved" ? "green" : "amber"}>
                {teamStatusLabel(team.status)}
              </Badge>
              <Badge tone="blue">{event.name}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-black text-ink">{team.name}</h2>
            <p className="mt-1 text-sm font-semibold text-brand-muted">{event.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-brand-muted transition hover:bg-brand-electric/10 hover:text-brand-electric"
            aria-label="Cerrar detalle de equipo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-96px)] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <DelegateInfo team={team} />
            <div className="rounded-md border border-brand-towerMid/25 bg-brand-wash p-4 text-sm">
              <p className="text-xs font-black uppercase text-brand-muted">Proximo partido</p>
              {nextMatch ? (
                <div className="mt-2 space-y-1 font-semibold text-brand-muted">
                  <p className="font-bold text-ink">
                    {getMatchSideLabel(nextMatch, teams, "home")} vs{" "}
                    {getMatchSideLabel(nextMatch, teams, "away")}
                  </p>
                  <p>{formatDateTime(nextMatch.scheduledAt)}</p>
                  <p>{nextMatch.court}</p>
                </div>
              ) : (
                <p className="mt-2 font-semibold text-brand-muted">Sin partido programado.</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-brand-towerMid/25">
            <div className="border-b border-brand-towerMid/20 bg-brand-wash px-4 py-3">
              <p className="font-bold text-ink">Jugadores</p>
              <p className="mt-1 text-xs font-semibold text-brand-muted">
                Vista publica: no se muestran DNI ni documentos.
              </p>
            </div>
            <TeamRoster players={players} />
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
