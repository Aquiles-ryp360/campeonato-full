"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompetitionData } from "@/lib/data-mappers";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { formatDateTime, getMatchSideLabel, sportLabel } from "@/lib/utils";
import {
  formatMatchScore,
  liveStatusDescription,
  splitPublicLiveMatches
} from "@/lib/live-match";
import type { Match, Team, TournamentEvent } from "@/lib/types";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { ChampionshipHero } from "./ChampionshipHero";
import { ChampionshipSummaryCards } from "./ChampionshipSummaryCards";
import { FormatRenderer } from "./FormatRenderer";

export function PublicHome({
  data,
  initialChampionship
}: {
  data: CompetitionData;
  initialChampionship?: string;
}) {
  const router = useRouter();
  const initial = getChampionshipPublicContext(data, initialChampionship);
  const [eventId, setEventId] = useState(initial.event?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const context = useMemo(
    () => getChampionshipPublicContext(data, eventId || initialChampionship),
    [data, eventId, initialChampionship]
  );
  const visibleMatches = useMemo(
    () =>
      context.event
        ? buildVisibleFixtureMatches({
            events: [context.event],
            teams: context.teams,
            matches: context.matches,
            venues: context.venues
          })
        : context.matches,
    [context]
  );
  const liveMatches = useMemo(
    () => splitPublicLiveMatches(context.event?.publicLiveScores === false ? [] : visibleMatches),
    [context.event?.publicLiveScores, visibleMatches]
  );

  useEffect(() => {
    if (liveMatches.all.length === 0) return;
    const refreshId = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(refreshId);
  }, [liveMatches.all.length, router]);

  if (!context.event) {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Vista publica"
          title="No hay campeonatos configurados"
          description="Cuando exista informacion en Supabase o mocks, se mostrara aqui."
        />
      </Card>
    );
  }

  const courts = Array.from(new Set(visibleMatches.map((match) => match.court))).slice(0, 3);
  const selectedTeam = context.teams.find((team) => team.id === selectedTeamId) ?? null;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <ChampionshipHero
        event={context.event}
        events={context.events}
        teamCount={context.teams.length}
        courts={courts}
        onChangeEvent={(nextEventId) => {
          setEventId(nextEventId);
          setSelectedTeamId(null);
        }}
      />

      <PublicLiveMatches
        event={context.event}
        teams={context.teams}
        matches={visibleMatches}
      />

      <ChampionshipSummaryCards
        event={context.event}
        teams={context.teams}
        matches={visibleMatches}
      />

      <FormatRenderer
        event={context.event}
        teams={context.teams}
        players={context.players}
        matches={visibleMatches}
        standings={context.standings}
        groups={context.groups}
        groupTeams={context.groupTeams}
        groupStandings={context.groupStandings}
      />

      <Card className="p-5">
        <SectionHeader
          title="Equipos inscritos"
          description="Selecciona un equipo para ver detalle publico sin DNI ni documentos."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {context.teams.length > 0 ? (
            context.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                playerCount={context.players.filter((player) => player.teamId === team.id).length}
                onOpen={(nextTeam) => setSelectedTeamId(nextTeam.id)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55 sm:col-span-2 lg:col-span-4">
              Todavia no hay equipos inscritos en este campeonato.
            </div>
          )}
        </div>
      </Card>

      <TeamDetailsModal
        team={selectedTeam}
        event={context.event}
        players={context.players.filter((player) => player.teamId === selectedTeam?.id)}
        matches={visibleMatches}
        teams={context.teams}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}

function PublicLiveMatches({
  event,
  teams,
  matches
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
}) {
  const { primary, secondary } = splitPublicLiveMatches(matches);
  if (!primary || event.publicLiveScores === false) return null;

  return (
    <section className="space-y-3">
      <div className="rounded-md bg-ink p-5 text-white shadow-panel">
        <LiveMatchHeader event={event} match={primary} />
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <LiveTeamName name={getMatchSideLabel(primary, teams, "home")} />
          <div className="rounded-md bg-white px-4 py-3 text-center text-ink">
            <p className="text-4xl font-black tabular-nums">{formatMatchScore(primary)}</p>
          </div>
          <LiveTeamName name={getMatchSideLabel(primary, teams, "away")} align="right" />
        </div>
        <p className="mt-4 text-center text-sm font-bold text-white/75">
          {liveClockLabel(primary, event)}
        </p>
      </div>

      {secondary.length > 0 ? (
        <div className="rounded-md border border-ink/10 bg-white p-4">
          <p className="text-xs font-black uppercase text-ink/45">Tambien en vivo</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {secondary.map((match) => (
              <article
                key={match.id}
                className="rounded-md border border-ink/10 bg-mist p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={match.liveStatus === "penalties" ? "amber" : "dark"}>
                    {match.liveStatus === "penalties" ? "Penales" : "En vivo"}
                  </Badge>
                  <span className="text-xs font-bold text-ink/55">{match.court}</span>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <p className="truncate text-sm font-black text-ink">{getMatchSideLabel(match, teams, "home")}</p>
                  <p className="rounded bg-ink px-2 py-1 text-lg font-black tabular-nums text-white">
                    {formatMatchScore(match)}
                  </p>
                  <p className="truncate text-right text-sm font-black text-ink">{getMatchSideLabel(match, teams, "away")}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink/55">{liveClockLabel(match, event)}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LiveMatchHeader({ event, match }: { event: TournamentEvent; match: Match }) {
  const headline =
    match.liveStatus === "penalties"
      ? "EN PENALES"
      : match.liveStatus === "submitted" || match.liveStatus === "under_review"
        ? "EN EVALUACION"
        : "EN VIVO";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-amber-300">{headline}</p>
        <h2 className="mt-1 text-xl font-black">{event.name}</h2>
        <p className="mt-1 text-sm font-semibold text-white/65">
          {sportLabel(event.sport)} - {event.category}
        </p>
      </div>
      <div className="text-right text-xs font-bold text-white/65">
        <p>{match.court}</p>
        <p>{formatDateTime(match.scheduledAt)}</p>
        <p>{liveStatusDescription(match)}</p>
      </div>
    </div>
  );
}

function LiveTeamName({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <p className={`line-clamp-2 text-sm font-black sm:text-xl ${align === "right" ? "text-right" : ""}`}>
      {name}
    </p>
  );
}

function liveClockLabel(match: Match, event: TournamentEvent) {
  const status = match.liveStatus ?? "scheduled";
  const firstHalfMinute = event.scheduleConfig?.halfTimeMinute ?? Math.floor((event.scheduleConfig?.matchDurationMinutes ?? 90) / 2);

  if (status === "in_progress_first_half") {
    return `Primer tiempo - Minuto ${elapsedMinute(match.firstHalfStartedAt ?? match.actualStartedAt)}`;
  }

  if (status === "halftime") return "Descanso";

  if (status === "in_progress_second_half") {
    return `Segundo tiempo - Minuto ${firstHalfMinute + elapsedMinute(match.secondHalfStartedAt)}`;
  }

  if (status === "penalties") return "Penales en curso";
  if (status === "submitted" || status === "under_review") return "Resultado en evaluacion";
  return liveStatusDescription(match);
}

function elapsedMinute(value?: string) {
  if (!value) return 0;
  return Math.max(1, Math.ceil((Date.now() - new Date(value).getTime()) / 60000));
}
