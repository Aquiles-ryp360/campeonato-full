"use client";

import { Trophy } from "lucide-react";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import type { Match, SeedingMode, Team } from "@/lib/types";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { ThirdPlaceMatch } from "./ThirdPlaceMatch";

export function KnockoutBracket({
  eventId,
  teams,
  matches,
  seedingMode,
  randomSeed,
  onOpenTeam
}: {
  eventId: string;
  teams: Team[];
  matches: Match[];
  seedingMode?: SeedingMode;
  randomSeed?: string;
  onOpenTeam?: (team: Team) => void;
}) {
  const bracket = generateKnockoutBracket({ eventId, teams, matches, seedingMode, randomSeed });
  const rounds = bracket.rounds.filter((round) => round.stage !== "third_place");

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-md border border-ink/10 bg-ink p-4 text-white">
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
                <div key={slot.id} className="rounded-md border border-white/15 bg-white p-3 text-ink shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded bg-ink px-2 py-1 text-[10px] font-black uppercase text-white">
                      {slot.label}
                    </span>
                    {slot.match?.status === "finished" ? (
                      <span className="text-[10px] font-bold uppercase text-field">Fin</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-ink/40">Pend.</span>
                    )}
                  </div>
                  <TeamLine teamId={slot.homeTeamId} fallback={slot.homeLabel} teams={teams} onOpenTeam={onOpenTeam} />
                  <TeamLine teamId={slot.awayTeamId} fallback={slot.awayLabel} teams={teams} onOpenTeam={onOpenTeam} />
                  <p className="mt-3 truncate text-[11px] text-ink/50">
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
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/8 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-amber-300 text-ink">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Llave dinamica</p>
            <p className="text-sm text-white/65">
              Base {bracket.bracketSize} equipos, {bracket.byeCount} bye(s) calculados.
            </p>
          </div>
        </div>
        <ThirdPlaceMatch slot={bracket.thirdPlace} teams={teams} onOpenTeam={onOpenTeam} />
      </div>
    </div>
  );
}

function TeamLine({
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
  const score = "";

  if (!team) {
    return (
      <div className="mb-1 flex min-h-9 items-center rounded bg-mist px-2 text-sm text-ink/55">
        {fallback}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenTeam?.(team)}
      className="mb-1 flex min-h-9 w-full items-center justify-between gap-2 rounded bg-mist px-2 text-left text-sm font-semibold hover:bg-field/10 hover:text-field"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
        <span className="truncate">{team.name}</span>
      </span>
      {score}
    </button>
  );
}
