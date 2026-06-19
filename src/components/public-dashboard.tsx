"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Eye,
  Trophy,
  UsersRound
} from "lucide-react";
import { events, matches, players, teams } from "@/lib/mock-data";
import type { Match, Team } from "@/lib/types";
import {
  calculateStandings,
  eventStatusLabel,
  formatDateTime,
  formatLabel,
  getTeamName,
  sportLabel
} from "@/lib/utils";
import { Badge, Button, Card, Metric, SectionHeader } from "./ui";

export function PublicDashboard() {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];
  const eventTeams = teams.filter((team) => team.eventId === selectedEvent.id);
  const eventMatches = matches.filter((match) => match.eventId === selectedEvent.id);
  const standings = useMemo(
    () => calculateStandings(selectedEvent, teams, matches),
    [selectedEvent]
  );

  const [selectedTeamId, setSelectedTeamId] = useState(eventTeams[0]?.id ?? "");
  const [selectedMatchId, setSelectedMatchId] = useState(eventMatches[0]?.id ?? "");
  const selectedTeam =
    eventTeams.find((team) => team.id === selectedTeamId) ?? eventTeams[0] ?? null;
  const selectedMatch =
    eventMatches.find((match) => match.id === selectedMatchId) ?? eventMatches[0] ?? null;
  const finishedMatches = eventMatches.filter((match) => match.status === "finished");

  function selectTeam(team: Team) {
    setSelectedTeamId(team.id);
  }

  function selectMatch(match: Match) {
    setSelectedMatchId(match.id);
    setSelectedTeamId(match.homeTeamId);
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="dark">Panel publico</Badge>
          <Badge tone="dark">Fixture</Badge>
          <Badge tone="dark">{eventStatusLabel(selectedEvent.status)}</Badge>
        </div>
        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-5xl">{selectedEvent.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Vista rapida de la rama del campeonato, equipos inscritos, horarios,
              resultados y resumen de tabla.
            </p>
          </div>
          <Button href="/registro" variant="secondary">
            Inscribir equipo
          </Button>
        </div>
      </section>

      <Card className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => {
                setEventId(event.id);
                const firstTeam = teams.find((team) => team.eventId === event.id);
                const firstMatch = matches.find((match) => match.eventId === event.id);
                setSelectedTeamId(firstTeam?.id ?? "");
                setSelectedMatchId(firstMatch?.id ?? "");
              }}
              className={`min-w-[220px] rounded-md border px-4 py-3 text-left transition ${
                event.id === selectedEvent.id
                  ? "border-field bg-field/10"
                  : "border-ink/10 bg-white hover:bg-mist"
              }`}
            >
              <p className="font-bold text-ink">{event.name}</p>
              <p className="mt-1 text-xs text-ink/58">
                {sportLabel(event.sport)} · {event.category} · {formatLabel(event.format)}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Equipos" value={`${eventTeams.length}/${selectedEvent.maxTeams}`} icon={UsersRound} />
        <Metric label="Partidos jugados" value={`${finishedMatches.length}`} icon={Trophy} tone="blue" />
        <Metric label="Proxima fecha" value={nextMatchLabel(eventMatches)} icon={Clock} tone="amber" />
        <Metric label="Formato" value={formatLabel(selectedEvent.format)} icon={CalendarDays} tone="green" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader
            title="Rama del fixture"
            description="Primero los equipos, luego los partidos y al final los clasificados. Toca un equipo para ver su informacion."
          />
          <div className="mt-5 grid gap-4 overflow-x-auto lg:grid-cols-[0.85fr_1.1fr_0.8fr]">
            <div className="min-w-[220px] space-y-3">
              <p className="text-xs font-bold uppercase text-ink/45">Equipos inscritos</p>
              {eventTeams.map((team) => (
                <TeamNode
                  key={team.id}
                  team={team}
                  active={selectedTeam?.id === team.id}
                  onClick={() => selectTeam(team)}
                />
              ))}
            </div>

            <div className="min-w-[320px] space-y-3">
              <p className="text-xs font-bold uppercase text-ink/45">Partidos / cruces</p>
              {eventMatches.map((match) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  active={selectedMatch?.id === match.id}
                  onClick={() => selectMatch(match)}
                />
              ))}
            </div>

            <div className="min-w-[220px] space-y-3">
              <p className="text-xs font-bold uppercase text-ink/45">Avance</p>
              {standings.slice(0, 4).map((row, index) => {
                const team = eventTeams.find((current) => current.id === row.teamId);
                if (!team) return null;
                return (
                  <button
                    key={row.teamId}
                    onClick={() => selectTeam(team)}
                    className="w-full rounded-md border border-ink/10 bg-white p-3 text-left transition hover:border-field"
                  >
                    <p className="text-xs font-bold uppercase text-field">
                      {index === 0 ? "Finalista parcial" : `Clasificado ${index + 1}`}
                    </p>
                    <p className="mt-1 font-bold text-ink">{row.teamName}</p>
                    <p className="text-xs text-ink/55">{row.points} pts · DG {row.goalDifference}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Detalle rapido"
            description="Informacion necesaria del equipo y del cruce seleccionado."
          />
          {selectedTeam ? (
            <div className="mt-5 rounded-md border border-ink/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-field">Equipo</p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{selectedTeam.name}</h3>
                  <p className="mt-1 text-sm text-ink/58">
                    {players.filter((player) => player.teamId === selectedTeam.id).length} jugadores registrados
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span
                    className="h-8 w-8 rounded-md border border-ink/10"
                    style={{ backgroundColor: selectedTeam.primaryColor }}
                  />
                  <span
                    className="h-8 w-8 rounded-md border border-ink/10"
                    style={{ backgroundColor: selectedTeam.secondaryColor }}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-ink/65">
                <InfoRow label="Delegado" value={selectedTeam.delegateName} />
                <InfoRow label="Proximo partido" value={teamNextMatch(eventMatches, selectedTeam.id)} />
                <InfoRow label="Ultimo resultado" value={teamLastResult(eventMatches, selectedTeam.id)} />
              </div>
            </div>
          ) : null}

          {selectedMatch ? (
            <div className="mt-4 rounded-md border border-ink/10 bg-mist p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-ink/45">
                <Eye className="h-4 w-4" />
                Partido seleccionado
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-bold">
                <span>{getTeamName(teams, selectedMatch.homeTeamId)}</span>
                <span className="rounded-md bg-white px-3 py-2">
                  {selectedMatch.status === "finished"
                    ? `${selectedMatch.homeScore} - ${selectedMatch.awayScore}`
                    : "vs"}
                </span>
                <span className="text-right">{getTeamName(teams, selectedMatch.awayTeamId)}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-ink/65">
                <InfoRow label="Hora" value={formatDateTime(selectedMatch.scheduledAt)} />
                <InfoRow label="Cancha" value={selectedMatch.court} />
                <InfoRow
                  label="Faltas"
                  value={
                    selectedMatch.status === "finished"
                      ? `${selectedMatch.homeFouls ?? 0} - ${selectedMatch.awayFouls ?? 0}`
                      : "Pendiente"
                  }
                />
                <InfoRow label="Observacion" value={selectedMatch.notes ?? "Sin observaciones"} />
              </div>
              {selectedMatch.notes?.toLowerCase().includes("cruce") ? (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  Revisar horario para evitar cruce de partidos.
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-ink/10 p-5">
            <SectionHeader title="Resumen de posiciones" description={selectedEvent.rulesSummary} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-mist text-left text-xs uppercase text-ink/55">
                <tr>
                  <th className="px-5 py-3">Equipo</th>
                  <th className="px-3 py-3">PJ</th>
                  <th className="px-3 py-3">PG</th>
                  <th className="px-3 py-3">PE</th>
                  <th className="px-3 py-3">PP</th>
                  <th className="px-3 py-3">DG</th>
                  <th className="px-5 py-3">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {standings.map((row, index) => (
                  <tr key={row.teamId} className="bg-white">
                    <td className="px-5 py-3 font-semibold">
                      <span className="mr-3 text-ink/40">{index + 1}</span>
                      {row.teamName}
                    </td>
                    <td className="px-3 py-3">{row.played}</td>
                    <td className="px-3 py-3">{row.won}</td>
                    <td className="px-3 py-3">{row.drawn}</td>
                    <td className="px-3 py-3">{row.lost}</td>
                    <td className="px-3 py-3">{row.goalDifference}</td>
                    <td className="px-5 py-3 font-bold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Horarios importantes" description="Lista de partidos para revisar cruces y proximas fechas." />
          <div className="mt-4 space-y-3">
            {eventMatches.map((match) => (
              <button
                key={match.id}
                onClick={() => selectMatch(match)}
                className="w-full rounded-md border border-ink/10 bg-white p-4 text-left transition hover:border-field"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={match.status === "finished" ? "green" : "blue"}>
                    Jornada {match.round}
                  </Badge>
                  <Eye className="h-4 w-4 text-ink/45" />
                </div>
                <p className="mt-3 text-sm font-bold text-ink">
                  {getTeamName(teams, match.homeTeamId)} vs {getTeamName(teams, match.awayTeamId)}
                </p>
                <p className="mt-1 text-xs text-ink/55">{formatDateTime(match.scheduledAt)} · {match.court}</p>
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function TeamNode({
  team,
  active,
  onClick
}: {
  team: Team;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md border p-3 text-left transition ${
        active ? "border-field bg-field/10" : "border-ink/10 bg-white hover:border-field"
      }`}
    >
      <p className="font-bold text-ink">{team.name}</p>
      <p className="mt-1 text-xs text-ink/55">Delegado: {team.delegateName}</p>
    </button>
  );
}

function MatchNode({
  match,
  active,
  onClick
}: {
  match: Match;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-md border bg-white p-4 text-left transition ${
        active ? "border-field shadow-panel" : "border-ink/10 hover:border-field"
      }`}
    >
      <div className="absolute -left-4 top-1/2 hidden h-px w-4 bg-ink/15 lg:block" />
      <div className="absolute -right-4 top-1/2 hidden h-px w-4 bg-ink/15 lg:block" />
      <div className="flex items-center justify-between">
        <Badge tone={match.status === "finished" ? "green" : "blue"}>
          J{match.round}
        </Badge>
        <Eye className="h-4 w-4 text-ink/45" />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-bold">
        <span>{getTeamName(teams, match.homeTeamId)}</span>
        <span className="rounded-md bg-mist px-2 py-1">
          {match.status === "finished" ? `${match.homeScore}-${match.awayScore}` : "vs"}
        </span>
        <span className="text-right">{getTeamName(teams, match.awayTeamId)}</span>
      </div>
      <p className="mt-2 text-xs text-ink/55">{formatDateTime(match.scheduledAt)}</p>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink/45">{label}</span>
      <span className="max-w-[70%] text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function nextMatchLabel(eventMatches: Match[]) {
  const next = eventMatches.find((match) => match.status === "scheduled");
  return next ? formatDateTime(next.scheduledAt) : "Sin fecha";
}

function teamNextMatch(eventMatches: Match[], teamId: string) {
  const next = eventMatches.find(
    (match) =>
      match.status === "scheduled" &&
      (match.homeTeamId === teamId || match.awayTeamId === teamId)
  );
  return next ? `${formatDateTime(next.scheduledAt)} · ${next.court}` : "Sin proximo partido";
}

function teamLastResult(eventMatches: Match[], teamId: string) {
  const last = eventMatches.find(
    (match) =>
      match.status === "finished" &&
      (match.homeTeamId === teamId || match.awayTeamId === teamId)
  );
  if (!last) return "Sin resultados";
  return `${getTeamName(teams, last.homeTeamId)} ${last.homeScore} - ${last.awayScore} ${getTeamName(teams, last.awayTeamId)}`;
}
