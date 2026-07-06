"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Trophy, X } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { formatDateTime, getMatchSideLabel, sportLabel } from "@/lib/utils";
import {
  formatMatchScore,
  liveStatusDescription,
  penaltyAttemptTone,
  splitPublicLiveMatches,
  summarizePenaltyShootout
} from "@/lib/live-match";
import type { Match, MatchLiveEvent, Team, TournamentEvent } from "@/lib/types";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { ChampionshipHero } from "./ChampionshipHero";
import { ChampionshipSummaryCards } from "./ChampionshipSummaryCards";
import { FormatRenderer } from "./FormatRenderer";

const championshipLocationUrl = "https://maps.app.goo.gl/6UXhMSPc8SGkTxoT8";

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
  const activeTeams = context.teams.filter((team) =>
    isActiveRegistrationTeamStatus(team.status)
  );
  const selectedTeam = activeTeams.find((team) => team.id === selectedTeamId) ?? null;
  const activeTeamCount = activeTeams.length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <ChampionshipHero
        event={context.event}
        events={context.events}
        teamCount={activeTeamCount}
        courts={courts}
        onChangeEvent={(nextEventId) => {
          setEventId(nextEventId);
          setSelectedTeamId(null);
        }}
      />

      <Card className="p-5">
        <SectionHeader
          eyebrow="Sede"
          title="Ubicacion"
          description="Sede marcada en Google Maps: -15.826160, -70.014487."
          action={
            <Button href={championshipLocationUrl}>
              <MapPin className="h-4 w-4" />
              Ver ubicacion
            </Button>
          }
        />
      </Card>

      <PublicLiveMatches
        event={context.event}
        teams={context.teams}
        matches={visibleMatches}
        events={context.matchLiveEvents}
      />

      <PublicChampionBanner
        event={context.event}
        teams={context.teams}
        matches={visibleMatches}
      />

      <ChampionshipSummaryCards
        event={context.event}
        teams={context.teams}
        teamCount={activeTeamCount}
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
          {activeTeams.length > 0 ? (
            activeTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                playerCount={context.players.filter((player) => player.teamId === team.id).length}
                onOpen={(nextTeam) => setSelectedTeamId(nextTeam.id)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-brand-towerMid/40 bg-brand-wash/60 p-6 text-center text-sm font-semibold text-brand-muted sm:col-span-2 lg:col-span-4">
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

function PublicChampionBanner({
  event,
  teams,
  matches
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
}) {
  if (!event.championTeamId) return null;

  const champion = teams.find((team) => team.id === event.championTeamId);
  const finalMatch = matches.find((match) => match.id === event.championMatchId);

  return (
    <section className="rounded-lg border border-brand-yellow/70 bg-brand-yellow p-4 text-brand-navy shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-brand-navy text-white">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-brand-navy/70">Campeon</p>
            <h2 className="text-2xl font-black">{champion?.name ?? "Equipo campeon"}</h2>
          </div>
        </div>
        {finalMatch ? (
          <div className="rounded-md bg-white px-3 py-2 text-sm font-black shadow-insetLine">
            Final: {getMatchSideLabel(finalMatch, teams, "home")} {formatMatchScore(finalMatch)} {getMatchSideLabel(finalMatch, teams, "away")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PublicLiveMatches({
  event,
  teams,
  matches,
  events = []
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
  events?: MatchLiveEvent[];
}) {
  const { primary, secondary } = splitPublicLiveMatches(matches);
  if (!primary || event.publicLiveScores === false) return null;

  return (
    <section className="space-y-3">
      <div className="rounded-lg bg-technical-blue p-5 text-white shadow-panel">
        <LiveMatchHeader event={event} match={primary} />
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <LiveTeamName name={getMatchSideLabel(primary, teams, "home")} />
          <div className="rounded-md bg-white px-4 py-3 text-center text-brand-navy shadow-lift">
            <p className="text-4xl font-black tabular-nums leading-none">{formatMatchScore(primary)}</p>
          </div>
          <LiveTeamName name={getMatchSideLabel(primary, teams, "away")} align="right" />
        </div>
        <p className="mt-4 text-center text-sm font-bold text-white/75">
          {liveClockLabel(primary, event)}
        </p>
        <PublicPenaltyStrip
          match={primary}
          teams={teams}
          events={events.filter((item) => item.matchId === primary.id)}
        />
      </div>

      {secondary.length > 0 ? (
        <div className="rounded-lg border border-brand-towerMid/25 bg-white p-4 shadow-panel">
          <p className="text-xs font-black uppercase text-brand-muted">Tambien en vivo</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {secondary.map((match) => (
              <article
                key={match.id}
                className="rounded-md border border-brand-towerMid/25 bg-brand-wash p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={match.liveStatus === "under_review" ? "amber" : match.liveStatus === "disputed" ? "red" : "dark"}>
                    {liveStatusDescription(match)}
                  </Badge>
                  <span className="text-xs font-bold text-brand-muted">{match.court}</span>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <p className="truncate text-sm font-black text-ink">{getMatchSideLabel(match, teams, "home")}</p>
                  <p className="rounded bg-brand-navy px-2 py-1 text-lg font-black tabular-nums text-white">
                    {formatMatchScore(match)}
                  </p>
                  <p className="truncate text-right text-sm font-black text-ink">{getMatchSideLabel(match, teams, "away")}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-brand-muted">{liveClockLabel(match, event)}</p>
                <PublicPenaltyStrip
                  match={match}
                  teams={teams}
                  events={events.filter((item) => item.matchId === match.id)}
                  compact
                />
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PublicPenaltyStrip({
  match,
  teams,
  events,
  compact = false
}: {
  match: Match;
  teams: Team[];
  events: MatchLiveEvent[];
  compact?: boolean;
}) {
  const penaltiesVisible = match.liveStatus === "penalties" || (match.penaltyHomeScore ?? 0) > 0 || (match.penaltyAwayScore ?? 0) > 0;
  if (!penaltiesVisible) return null;

  const summary = summarizePenaltyShootout(match, events);
  const homeName = getMatchSideLabel(match, teams, "home");
  const awayName = getMatchSideLabel(match, teams, "away");

  return (
    <div className={compact ? "mt-3 rounded-md bg-white p-2" : "mt-4 rounded-md bg-white/10 p-3"}>
      <div className="flex items-center justify-between gap-3">
        <p className={`font-black ${compact ? "text-xs text-ink" : "text-sm text-white"}`}>Penales</p>
        <p className={`font-black tabular-nums ${compact ? "text-xs text-ink" : "text-sm text-white"}`}>
          {summary.homeScore} - {summary.awayScore}
        </p>
      </div>
      <div className="mt-2 grid gap-2">
        <PublicPenaltyRow name={homeName} attempts={summary.home} compact={compact} />
        <PublicPenaltyRow name={awayName} attempts={summary.away} compact={compact} />
      </div>
    </div>
  );
}

function PublicPenaltyRow({
  name,
  attempts,
  compact
}: {
  name: string;
  attempts: ReturnType<typeof summarizePenaltyShootout>["home"];
  compact: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <p className={`truncate text-xs font-black ${compact ? "text-brand-muted" : "text-white/75"}`}>{name}</p>
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {attempts.length > 0 ? (
          attempts.map((attempt) => {
            const tone = penaltyAttemptTone(attempt.scored);
            return (
              <span
                key={attempt.id}
                className={`inline-flex min-h-8 min-w-9 items-center justify-center gap-1 rounded px-1.5 text-[11px] font-black text-white ${
                  tone === "green" ? "bg-green-600" : "bg-red-600"
                }`}
                title={`Penal ${attempt.order}`}
              >
                {attempt.scored ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {attempt.jerseyNumber ?? "S/N"}
              </span>
            );
          })
        ) : (
          <span className={`text-xs font-semibold ${compact ? "text-ink/45" : "text-white/55"}`}>Sin tiros</span>
        )}
      </div>
    </div>
  );
}

function LiveMatchHeader({ event, match }: { event: TournamentEvent; match: Match }) {
  const headline =
    match.liveStatus === "penalties"
      ? "EN PENALES"
      : match.liveStatus === "under_review"
        ? "EN REVISION"
        : match.liveStatus === "corrected"
          ? "RESULTADO CORREGIDO"
          : match.liveStatus === "referee_submitted" || match.liveStatus === "submitted" || match.liveStatus === "validated"
            ? "RESULTADO OFICIAL"
            : "EN VIVO";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-brand-yellow">{headline}</p>
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
  if (status === "referee_submitted" || status === "submitted") return "Resultado cargado por arbitro";
  if (status === "under_review") return "Resultado en revision";
  if (status === "corrected") return "Resultado corregido";
  if (status === "validated") return "Resultado validado";
  return liveStatusDescription(match);
}

function elapsedMinute(value?: string) {
  if (!value) return 0;
  return Math.max(1, Math.ceil((Date.now() - new Date(value).getTime()) / 60000));
}
