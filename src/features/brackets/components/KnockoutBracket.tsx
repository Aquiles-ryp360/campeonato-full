"use client";

import { Check, Shuffle, Trophy, UsersRound } from "lucide-react";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import type { FixtureStatus, Match, SeedingMode, Team } from "@/lib/types";
import { Badge } from "@/components/ui";
import { cn, formatDateTime } from "@/lib/utils";
import { liveStatusLabel, shouldAdvanceOfficialWinner, visiblePenaltyScores } from "@/lib/live-match";
import { ThirdPlaceMatch } from "./ThirdPlaceMatch";

export function KnockoutBracket({
  eventId,
  teams,
  matches,
  maxTeams,
  thirdPlace,
  allowByes,
  seedingMode,
  randomSeed,
  fixtureStatus,
  onOpenTeam
}: {
  eventId: string;
  teams: Team[];
  matches: Match[];
  maxTeams?: number;
  thirdPlace?: boolean;
  allowByes?: boolean;
  seedingMode?: SeedingMode;
  randomSeed?: string;
  fixtureStatus?: FixtureStatus;
  onOpenTeam?: (team: Team) => void;
}) {
  const bracket = generateKnockoutBracket({
    eventId,
    teams,
    matches,
    maxTeams,
    thirdPlace,
    allowByes,
    seedingMode,
    randomSeed,
    fixtureStatus
  });
  const rounds = bracket.rounds.filter((round) => round.stage !== "third_place");
  const filledTeamCount = teams.length;
  const capacityCount = Math.max(maxTeams ?? 0, filledTeamCount);

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-technical-blue text-white shadow-panel">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-brand-yellow">Llaves del campeonato</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">
              {filledTeamCount > 0 ? `Llave para ${filledTeamCount} inscritos` : "Llave del campeonato"}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              {bracketSummary(bracket)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="dark">
              <UsersRound className="mr-1 h-3.5 w-3.5" />
              {filledTeamCount}/{capacityCount || filledTeamCount} inscritos
            </Badge>
            <Badge tone={seedingMode === "random" ? "amber" : "dark"}>
              <Shuffle className="mr-1 h-3.5 w-3.5" />
              {seedingMode === "random" ? "Sorteo aleatorio" : "Orden de inscripcion"}
            </Badge>
            {bracket.preliminaryMatches > 0 ? (
              <Badge tone="amber">{bracket.preliminaryMatches} preliminares</Badge>
            ) : (
              <Badge tone="dark">Sin preliminar</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain p-4">
      <div
        className="grid min-w-[900px] gap-5"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, rounds.length)}, minmax(180px, 1fr))` }}
      >
        {rounds.map((round, roundIndex) => (
          <section key={round.id} className="flex min-h-[360px] flex-col gap-3">
            <div className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-3 py-2">
              <p className="text-xs font-black uppercase">{round.name}</p>
              <Badge tone="dark">{round.slots.length}</Badge>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.slots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "relative rounded-md border border-white/20 bg-white p-3 text-ink shadow-panel",
                    roundIndex < rounds.length - 1 &&
                      "after:absolute after:left-full after:top-1/2 after:h-px after:w-5 after:bg-brand-yellow/60 after:content-['']"
                  )}
                >
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
      </div>

      <div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-[1fr_220px]">
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-yellow text-brand-navy">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Llave completa</p>
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
      <div className="mb-1 flex min-h-9 items-center justify-between gap-2 rounded border border-transparent bg-brand-wash px-2 text-sm text-brand-muted">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-sm border border-brand-towerMid/40 bg-slate-300" />
          <span className="truncate">{fallback}</span>
        </span>
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
