"use client";

import { Clock, MapPin } from "lucide-react";
import type { Match, Team, TournamentEvent } from "@/lib/types";
import type { ScheduleConflict } from "@/lib/domain/conflict-detector";
import { Badge } from "@/components/ui";
import { formatDateTime, getTeamName } from "@/lib/utils";
import { ConflictBadge } from "./ConflictBadge";

export function MatchCard({
  match,
  event,
  teams,
  conflicts = [],
  onOpenTeam,
  onOpenMatch
}: {
  match: Match;
  event?: TournamentEvent;
  teams: Team[];
  conflicts?: ScheduleConflict[];
  onOpenTeam?: (team: Team) => void;
  onOpenMatch?: (match: Match) => void;
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  return (
    <article className="rounded-md border border-ink/10 bg-white p-4 transition hover:border-field/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={match.status === "finished" ? "green" : "blue"}>
            {match.status === "finished" ? "Finalizado" : "Programado"}
          </Badge>
          {event ? <Badge tone="neutral">{event.name}</Badge> : null}
        </div>
        <ConflictBadge conflicts={conflicts} />
      </div>

      <div className="my-4 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-left">
        <TeamName team={homeTeam} fallback={getTeamName(teams, match.homeTeamId)} onOpenTeam={onOpenTeam} />
        <button
          type="button"
          onClick={() => onOpenMatch?.(match)}
          className="rounded-md bg-mist px-3 py-2 text-sm font-black text-ink transition hover:bg-field/10 hover:text-field"
          aria-label="Ver detalle del partido"
        >
          {match.status === "finished" ? `${match.homeScore} - ${match.awayScore}` : "VS"}
        </button>
        <TeamName
          team={awayTeam}
          fallback={getTeamName(teams, match.awayTeamId)}
          align="right"
          onOpenTeam={onOpenTeam}
        />
      </div>

      <div className="grid gap-2 rounded-md bg-mist/70 p-3 text-xs font-semibold text-ink/60 sm:grid-cols-2">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatDateTime(match.scheduledAt)}
        </span>
        <span className="flex items-center gap-1.5 sm:justify-end">
          <MapPin className="h-3.5 w-3.5" />
          {match.court}
        </span>
      </div>
    </article>
  );
}

function TeamName({
  team,
  fallback,
  align = "left",
  onOpenTeam
}: {
  team?: Team;
  fallback: string;
  align?: "left" | "right";
  onOpenTeam?: (team: Team) => void;
}) {
  const content = (
    <>
      {align === "left" ? (
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: team?.primaryColor ?? "#cbd5e1" }}
        />
      ) : null}
      <span className="truncate text-sm font-bold text-ink">{team?.name ?? fallback}</span>
      {align === "right" ? (
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: team?.primaryColor ?? "#cbd5e1" }}
        />
      ) : null}
    </>
  );

  if (!team || !onOpenTeam) {
    return (
      <span className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : ""}`}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenTeam(team);
      }}
      className={`flex min-w-0 items-center gap-2 rounded px-1 py-1 hover:bg-mist ${
        align === "right" ? "justify-end text-right" : ""
      }`}
    >
      {content}
    </button>
  );
}
