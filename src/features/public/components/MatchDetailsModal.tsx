"use client";

import { X } from "lucide-react";
import type { Match, Team } from "@/lib/types";
import { Badge } from "@/components/ui";
import { formatDateTime, getMatchSideLabel } from "@/lib/utils";
import { formatMatchScore, liveStatusLabel, visiblePenaltyScores } from "@/lib/live-match";

export function MatchDetailsModal({
  match,
  teams,
  onClose
}: {
  match: Match | null;
  teams: Team[];
  onClose: () => void;
}) {
  if (!match) return null;

  const liveStatus = match.liveStatus ?? "scheduled";
  const scoreVisible = match.status === "finished" || liveStatus !== "scheduled";
  const penalties = visiblePenaltyScores(match);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-panel sm:rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone={liveStatus === "under_review" ? "amber" : match.status === "finished" ? "green" : "blue"}>
              {liveStatusLabel(match.liveStatus, match.status)}
            </Badge>
            <h2 className="mt-3 text-xl font-bold text-ink">
              {getMatchSideLabel(match, teams, "home")} vs {getMatchSideLabel(match, teams, "away")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md text-ink/55 hover:bg-mist"
            aria-label="Cerrar detalle de partido"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
          <p>
            <span className="font-bold text-ink">Hora:</span> {formatDateTime(match.scheduledAt)}
          </p>
          <p>
            <span className="font-bold text-ink">Cancha:</span> {match.court}
          </p>
          <p>
            <span className="font-bold text-ink">Resultado:</span>{" "}
            {scoreVisible ? formatMatchScore(match) : "Pendiente"}
          </p>
          <p>
            <span className="font-bold text-ink">Jornada:</span> {match.round}
          </p>
        </div>
        {penalties.hasPenalties ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-950">
            Penales: {penalties.home} - {penalties.away}
          </p>
        ) : null}
        {match.notes ? (
          <p className="mt-4 rounded-md bg-mist p-3 text-sm text-ink/65">{match.notes}</p>
        ) : null}
      </div>
    </div>
  );
}
