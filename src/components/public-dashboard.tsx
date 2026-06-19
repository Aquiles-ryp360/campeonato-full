"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Eye,
  Medal,
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

      <section className="grid gap-6">
        <Card className="overflow-hidden">
          <div className="border-b border-ink/10 p-5">
            <SectionHeader
              title="Llave del fixture"
              description="Cruces del campeonato desde la primera ronda hasta la final. Toca el ojo para ver un partido o toca un equipo para revisar sus datos."
            />
          </div>
          <KnockoutBracket
            eventTeams={eventTeams}
            eventMatches={eventMatches}
            selectedMatchId={selectedMatch?.id}
            selectedTeamId={selectedTeam?.id}
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
          />
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

type BracketSlot = {
  id: string;
  code: string;
  match?: Match;
  homeTeamId?: string;
  awayTeamId?: string;
  homePlaceholder: string;
  awayPlaceholder: string;
};

function KnockoutBracket({
  eventTeams,
  eventMatches,
  selectedMatchId,
  selectedTeamId,
  onSelectMatch,
  onSelectTeam
}: {
  eventTeams: Team[];
  eventMatches: Match[];
  selectedMatchId?: string;
  selectedTeamId?: string;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (team: Team) => void;
}) {
  const bracket = buildBracket(eventTeams, eventMatches);

  return (
    <div className="overflow-x-auto bg-[#aa1d4b] p-4 text-white sm:p-5">
      <div className="min-w-[1120px] rounded-lg border border-white/12 bg-[#c02657] p-4 shadow-inner">
        <div className="mb-4 grid grid-cols-[150px_150px_150px_1fr_150px_150px_150px] items-center gap-4 text-center text-[11px] font-black uppercase tracking-wide text-white/84">
          <BracketStageLabel>Octavos</BracketStageLabel>
          <BracketStageLabel>Cuartos</BracketStageLabel>
          <BracketStageLabel>Semifinal</BracketStageLabel>
          <span className="rounded-md bg-white px-4 py-2 text-[#a01643] shadow-sm">
            Final
          </span>
          <BracketStageLabel>Semifinal</BracketStageLabel>
          <BracketStageLabel>Cuartos</BracketStageLabel>
          <BracketStageLabel>Octavos</BracketStageLabel>
        </div>

        <div className="grid min-h-[620px] grid-cols-[150px_150px_150px_1fr_150px_150px_150px] gap-4">
          <BracketColumn>
            {bracket.leftOctavos.map((slot) => (
              <BracketMatchCard
                key={slot.id}
                slot={slot}
                teams={eventTeams}
                selectedMatchId={selectedMatchId}
                selectedTeamId={selectedTeamId}
                connector="right"
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn className="py-16">
            {bracket.leftCuartos.map((slot) => (
              <BracketMatchCard
                key={slot.id}
                slot={slot}
                teams={eventTeams}
                selectedMatchId={selectedMatchId}
                selectedTeamId={selectedTeamId}
                connector="both"
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn className="py-28">
            <BracketMatchCard
              slot={bracket.leftSemi}
              teams={eventTeams}
              selectedMatchId={selectedMatchId}
              selectedTeamId={selectedTeamId}
              connector="both"
              onSelectMatch={onSelectMatch}
              onSelectTeam={onSelectTeam}
            />
          </BracketColumn>

          <div className="flex flex-col items-center justify-center gap-5 px-2">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-amber-300 text-[#7c1236] shadow-[0_18px_50px_rgba(0,0,0,0.24)] ring-8 ring-white/15">
              <Trophy className="h-12 w-12" />
            </div>

            <BracketMatchCard
              slot={bracket.final}
              teams={eventTeams}
              selectedMatchId={selectedMatchId}
              selectedTeamId={selectedTeamId}
              emphasis="final"
              onSelectMatch={onSelectMatch}
              onSelectTeam={onSelectTeam}
            />

            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#17211f] text-amber-200 ring-4 ring-white/12">
              <Medal className="h-8 w-8" />
            </div>

            <BracketMatchCard
              slot={bracket.thirdPlace}
              teams={eventTeams}
              selectedMatchId={selectedMatchId}
              selectedTeamId={selectedTeamId}
              emphasis="third"
              onSelectMatch={onSelectMatch}
              onSelectTeam={onSelectTeam}
            />
          </div>

          <BracketColumn className="py-28">
            <BracketMatchCard
              slot={bracket.rightSemi}
              teams={eventTeams}
              selectedMatchId={selectedMatchId}
              selectedTeamId={selectedTeamId}
              connector="both"
              onSelectMatch={onSelectMatch}
              onSelectTeam={onSelectTeam}
            />
          </BracketColumn>

          <BracketColumn className="py-16">
            {bracket.rightCuartos.map((slot) => (
              <BracketMatchCard
                key={slot.id}
                slot={slot}
                teams={eventTeams}
                selectedMatchId={selectedMatchId}
                selectedTeamId={selectedTeamId}
                connector="both"
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn>
            {bracket.rightOctavos.map((slot) => (
              <BracketMatchCard
                key={slot.id}
                slot={slot}
                teams={eventTeams}
                selectedMatchId={selectedMatchId}
                selectedTeamId={selectedTeamId}
                connector="left"
                onSelectMatch={onSelectMatch}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>
        </div>
      </div>
    </div>
  );
}

function BracketStageLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#17211f]/78 px-3 py-2 text-white shadow-sm">
      {children}
    </span>
  );
}

function BracketColumn({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-col justify-around gap-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function BracketMatchCard({
  slot,
  teams: eventTeams,
  selectedMatchId,
  selectedTeamId,
  connector,
  emphasis,
  onSelectMatch,
  onSelectTeam
}: {
  slot: BracketSlot;
  teams: Team[];
  selectedMatchId?: string;
  selectedTeamId?: string;
  connector?: "left" | "right" | "both";
  emphasis?: "final" | "third";
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (team: Team) => void;
}) {
  const matchActive = selectedMatchId === slot.match?.id;
  const homeTeam = slot.homeTeamId
    ? eventTeams.find((team) => team.id === slot.homeTeamId)
    : undefined;
  const awayTeam = slot.awayTeamId
    ? eventTeams.find((team) => team.id === slot.awayTeamId)
    : undefined;
  const isFinished = slot.match?.status === "finished";
  const homeScore = slot.match?.homeScore;
  const awayScore = slot.match?.awayScore;

  return (
    <div
      className={`relative rounded-md border p-2 shadow-sm transition ${
        matchActive
          ? "border-amber-200 bg-white text-ink shadow-[0_0_0_3px_rgba(252,211,77,0.35)]"
          : emphasis === "final"
            ? "border-amber-200 bg-white text-ink"
            : emphasis === "third"
              ? "border-white/22 bg-[#17211f] text-white"
              : "border-white/18 bg-white text-ink"
      }`}
    >
      {connector === "right" || connector === "both" ? (
        <span className="absolute -right-4 top-1/2 hidden h-px w-4 bg-white/45 lg:block" />
      ) : null}
      {connector === "left" || connector === "both" ? (
        <span className="absolute -left-4 top-1/2 hidden h-px w-4 bg-white/45 lg:block" />
      ) : null}

      <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
        <span
          className={`rounded px-2 py-1 text-[10px] font-black uppercase ${
            emphasis === "third"
              ? "bg-white/12 text-white"
              : "bg-[#17211f] text-white"
          }`}
        >
          {slot.code}
        </span>
        {slot.match ? (
          <button
            type="button"
            title="Ver partido"
            onClick={() => onSelectMatch(slot.match as Match)}
            className={`grid h-7 w-7 place-items-center rounded transition ${
              matchActive
                ? "bg-amber-300 text-ink"
                : emphasis === "third"
                  ? "bg-white/10 text-white hover:bg-white/18"
                  : "bg-mist text-ink/65 hover:bg-field/15 hover:text-field"
            }`}
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : (
          <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase opacity-70">
            Pendiente
          </span>
        )}
      </div>

      <div className="space-y-1">
        <BracketTeamLine
          team={homeTeam}
          placeholder={slot.homePlaceholder}
          score={isFinished ? homeScore : undefined}
          isWinner={isFinished && (homeScore ?? 0) > (awayScore ?? 0)}
          active={selectedTeamId === homeTeam?.id}
          dark={emphasis === "third"}
          onSelectTeam={onSelectTeam}
        />
        <BracketTeamLine
          team={awayTeam}
          placeholder={slot.awayPlaceholder}
          score={isFinished ? awayScore : undefined}
          isWinner={isFinished && (awayScore ?? 0) > (homeScore ?? 0)}
          active={selectedTeamId === awayTeam?.id}
          dark={emphasis === "third"}
          onSelectTeam={onSelectTeam}
        />
      </div>

      <p
        className={`mt-2 truncate text-[11px] ${
          emphasis === "third" ? "text-white/60" : "text-ink/50"
        }`}
      >
        {slot.match ? `${formatDateTime(slot.match.scheduledAt)} · ${slot.match.court}` : "Horario por definir"}
      </p>
    </div>
  );
}

function BracketTeamLine({
  team,
  placeholder,
  score,
  isWinner,
  active,
  dark,
  onSelectTeam
}: {
  team?: Team;
  placeholder: string;
  score?: number;
  isWinner: boolean;
  active: boolean;
  dark?: boolean;
  onSelectTeam: (team: Team) => void;
}) {
  const content = (
    <>
      <span
        className="h-3 w-3 shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: team?.primaryColor ?? "transparent" }}
      />
      <span className="min-w-0 flex-1 truncate">{team?.name ?? placeholder}</span>
      {typeof score === "number" ? (
        <span className="grid h-6 min-w-6 place-items-center rounded bg-black/10 px-1 text-xs font-black">
          {score}
        </span>
      ) : null}
    </>
  );

  if (!team) {
    return (
      <div
        className={`flex h-8 items-center gap-2 rounded px-2 text-xs font-semibold ${
          dark ? "bg-white/8 text-white/55" : "bg-mist text-ink/42"
        }`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectTeam(team)}
      className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs font-bold transition ${
        active
          ? "bg-field text-white"
          : isWinner
            ? "bg-amber-100 text-amber-950"
            : dark
              ? "bg-white/8 text-white hover:bg-white/14"
              : "bg-mist text-ink hover:bg-field/10"
      }`}
    >
      {content}
    </button>
  );
}

function buildBracket(eventTeams: Team[], eventMatches: Match[]) {
  const roundOne = eventMatches.filter((match) => match.round === 1);
  const roundTwo = eventMatches.filter((match) => match.round === 2);
  const roundThree = eventMatches.filter((match) => match.round === 3);
  const roundFour = eventMatches.filter((match) => match.round === 4);

  const octavos = Array.from({ length: 8 }, (_, index) =>
    makeSlot({
      id: `octavos-${index + 1}`,
      code: `O${index + 1}`,
      match: roundOne[index],
      homeTeamId: eventTeams[index * 2]?.id,
      awayTeamId: eventTeams[index * 2 + 1]?.id,
      homePlaceholder: `Equipo ${index * 2 + 1}`,
      awayPlaceholder: `Equipo ${index * 2 + 2}`
    })
  );

  const cuartos = Array.from({ length: 4 }, (_, index) =>
    makeSlot({
      id: `cuartos-${index + 1}`,
      code: `C${index + 1}`,
      match: roundTwo[index],
      homePlaceholder: `Ganador O${index * 2 + 1}`,
      awayPlaceholder: `Ganador O${index * 2 + 2}`
    })
  );

  const semis = Array.from({ length: 2 }, (_, index) =>
    makeSlot({
      id: `semifinal-${index + 1}`,
      code: `S${index + 1}`,
      match: roundThree[index],
      homePlaceholder: `Ganador C${index * 2 + 1}`,
      awayPlaceholder: `Ganador C${index * 2 + 2}`
    })
  );

  const final = makeSlot({
    id: "final",
    code: "Final",
    match: roundFour[0],
    homePlaceholder: "Ganador S1",
    awayPlaceholder: "Ganador S2"
  });

  const thirdPlace = makeSlot({
    id: "tercer-lugar",
    code: "Tercer lugar",
    match: roundFour[1],
    homePlaceholder: "Perdedor S1",
    awayPlaceholder: "Perdedor S2"
  });

  return {
    leftOctavos: octavos.slice(0, 4),
    rightOctavos: octavos.slice(4),
    leftCuartos: cuartos.slice(0, 2),
    rightCuartos: cuartos.slice(2),
    leftSemi: semis[0],
    rightSemi: semis[1],
    final,
    thirdPlace
  };
}

function makeSlot({
  id,
  code,
  match,
  homeTeamId,
  awayTeamId,
  homePlaceholder,
  awayPlaceholder
}: {
  id: string;
  code: string;
  match?: Match;
  homeTeamId?: string;
  awayTeamId?: string;
  homePlaceholder: string;
  awayPlaceholder: string;
}): BracketSlot {
  return {
    id,
    code,
    match,
    homeTeamId: match?.homeTeamId ?? homeTeamId,
    awayTeamId: match?.awayTeamId ?? awayTeamId,
    homePlaceholder,
    awayPlaceholder
  };
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
