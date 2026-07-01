"use client";

import { Clock, MapPin } from "lucide-react";
import type { Match, Team, TournamentEvent } from "@/lib/types";
import type { ScheduleConflict } from "@/lib/domain/conflict-detector";
import { Badge } from "@/components/ui";
import { fixtureStatusLabel, formatDateTime, getMatchSideLabel } from "@/lib/utils";
import { formatMatchScore, liveStatusLabel } from "@/lib/live-match";
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
  const fixturePreliminary = match.isFixturePreliminary || match.fixtureStatus === "draft_auto" || match.fixtureStatus === "draft_review";
  const liveStatus = match.liveStatus ?? "scheduled";
  const publicLiveScore = event?.publicLiveScores !== false && liveStatus !== "scheduled";
  const scoreVisible = match.status === "finished" || publicLiveScore;

  return (
    <article className="rounded-md border border-ink/10 bg-white p-4 transition hover:border-field/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusBadgeTone(liveStatus, match.status)}>
            {matchStatusLabel(liveStatus, match.status)}
          </Badge>
          {event ? <Badge tone="neutral">{event.name}</Badge> : null}
          {fixturePreliminary ? <Badge tone="amber">{fixtureStatusLabel(match.fixtureStatus)}</Badge> : null}
        </div>
        <ConflictBadge conflicts={conflicts} />
      </div>

      <div className="my-4 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-left">
        <TeamName team={homeTeam} fallback={getMatchSideLabel(match, teams, "home")} onOpenTeam={onOpenTeam} />
        <button
          type="button"
          onClick={() => onOpenMatch?.(match)}
          className="rounded-md bg-mist px-3 py-2 text-sm font-black text-ink transition hover:bg-field/10 hover:text-field"
          aria-label="Ver detalle del partido"
        >
          {scoreVisible ? formatMatchScore(match) : "VS"}
        </button>
        <TeamName
          team={awayTeam}
          fallback={getMatchSideLabel(match, teams, "away")}
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

function matchStatusLabel(liveStatus: Match["liveStatus"], status: Match["status"]) {
  return liveStatusLabel(liveStatus, status);
}

function statusBadgeTone(
  liveStatus: Match["liveStatus"],
  status: Match["status"]
): "neutral" | "green" | "amber" | "red" | "blue" | "dark" {
  if (liveStatus === "submitted" || liveStatus === "under_review") return "amber";
  if (liveStatus === "validated" || status === "finished") return "green";
  if (liveStatus === "disputed") return "red";
  if (liveStatus && liveStatus !== "scheduled") return "dark";
  return "blue";
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
