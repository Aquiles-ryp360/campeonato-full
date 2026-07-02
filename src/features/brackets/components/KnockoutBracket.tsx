"use client";

import { Check, Trophy } from "lucide-react";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import type { Match, Team } from "@/lib/types";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { liveStatusLabel, shouldAdvanceOfficialWinner, visiblePenaltyScores } from "@/lib/live-match";
import { ThirdPlaceMatch } from "./ThirdPlaceMatch";

export function KnockoutBracket({
  eventId,
  teams,
  matches,
  onOpenTeam
}: {
  eventId: string;
  teams: Team[];
  matches: Match[];
  onOpenTeam?: (team: Team) => void;
}) {
  const bracket = generateKnockoutBracket({ eventId, teams, matches });
  const rounds = bracket.rounds.filter((round) => round.stage !== "third_place");

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-white/10 bg-technical-blue p-4 text-white shadow-panel">
      <div
        className="grid min-w-[760px] gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, rounds.length)}, minmax(180px, 1fr))` }}
      >
        {rounds.map((round) => (
          <section key={round.id} className="flex min-h-[360px] flex-col gap-3">
            <div className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-wide">{round.name}</p>
              <Badge tone="dark">{round.slots.length}</Badge>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.slots.map((slot) => (
                <div key={slot.id} className="rounded-md border border-white/20 bg-white p-3 text-ink shadow-panel">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded bg-brand-navy px-2 py-1 text-[10px] font-black uppercase text-white">
                      {slot.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-brand-muted">
                      {liveStatusLabel(slot.match?.liveStatus, slot.match?.status)}
                    </span>
                  </div>
                  <TeamLine
                    side="home"
                    match={slot.match}
                    teamId={slot.homeTeamId}
                    fallback={slot.homeLabel}
                    teams={teams}
                    onOpenTeam={onOpenTeam}
                  />
                  <TeamLine
                    side="away"
                    match={slot.match}
                    teamId={slot.awayTeamId}
                    fallback={slot.awayLabel}
                    teams={teams}
                    onOpenTeam={onOpenTeam}
                  />
                  {provisionalWinnerName(slot.match, teams) ? (
                    <p className="mt-2 rounded bg-brand-yellow/30 px-2 py-1 text-[11px] font-bold text-brand-navy">
                      Ganador provisional: {provisionalWinnerName(slot.match, teams)}
                    </p>
                  ) : null}
                  <p className="mt-3 truncate text-[11px] text-brand-muted">
                    {slot.match?.scheduledAt
                      ? `${formatDateTime(slot.match.scheduledAt)} · ${slot.match.court}`
                      : "Horario por definir"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-yellow text-brand-navy">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Llave dinamica</p>
            <p className="text-sm text-white/70">
              {bracketSummary(bracket)}
            </p>
          </div>
        </div>
        <ThirdPlaceMatch slot={bracket.thirdPlace} teams={teams} onOpenTeam={onOpenTeam} />
      </div>
    </div>
  );
}

function bracketSummary(bracket: ReturnType<typeof generateKnockoutBracket>) {
  if (bracket.status === "incomplete") {
    return bracket.warnings[0] ?? "Se necesitan mas equipos para generar la llave.";
  }

  if (bracket.preliminaryMatches > 0) {
    return `${bracket.preliminaryTeams} equipos juegan preliminar; ${bracket.byeCount} pasan directo a la llave de ${bracket.lowerPowerOfTwo}.`;
  }

  return `Llave pareja de ${bracket.lowerPowerOfTwo} equipos, sin preliminar.`;
}

function TeamLine({
  side,
  match,
  teamId,
  fallback,
  teams,
  onOpenTeam
}: {
  side: "home" | "away";
  match?: Match;
  teamId?: string;
  fallback: string;
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  const team = teams.find((item) => item.id === teamId);
  const score = scoreForSide(match, side);
  const officialWinner = shouldAdvanceOfficialWinner(match?.liveStatus) && match?.winnerTeamId === teamId;

  if (!team) {
    return (
      <div className="mb-1 flex min-h-9 items-center justify-between gap-2 rounded bg-brand-wash px-2 text-sm text-brand-muted">
        <span className="truncate">{fallback}</span>
        {score ? <span className="font-black tabular-nums text-ink">{score}</span> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenTeam?.(team)}
      className="mb-1 flex min-h-9 w-full items-center justify-between gap-2 rounded bg-brand-wash px-2 text-left text-sm font-semibold hover:bg-brand-electric/10 hover:text-brand-electric"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
        <span className="truncate">{team.name}</span>
      </span>
      <span className="inline-flex items-center gap-1 font-black tabular-nums text-ink">
        {score}
        {officialWinner ? <Check className="h-3.5 w-3.5 text-green-700" /> : null}
      </span>
    </button>
  );
}

function scoreForSide(match: Match | undefined, side: "home" | "away") {
  if (!match) return "";

  const scoreVisible = match.status === "finished" || (match.liveStatus ?? "scheduled") !== "scheduled";
  if (!scoreVisible) return "";

  const penalties = visiblePenaltyScores(match);
  const score = side === "home" ? match.homeScore ?? 0 : match.awayScore ?? 0;
  const penaltyScore = side === "home" ? penalties.home : penalties.away;

  return penalties.hasPenalties ? `${score} (${penaltyScore})` : String(score);
}

function provisionalWinnerName(match: Match | undefined, teams: Team[]) {
  if (!match?.winnerTeamId) return null;
  if (match.liveStatus !== "under_review" && match.liveStatus !== "disputed") return null;
  return teams.find((team) => team.id === match.winnerTeamId)?.name ?? "Equipo ganador";
}
