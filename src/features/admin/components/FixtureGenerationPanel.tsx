"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info as InfoIcon, Lock, Mail, Send, Snowflake, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import type { TournamentEvent } from "@/lib/types";
import type { GeneratedBracket } from "@/lib/domain/bracket-generator";
import {
  buildEventFixturePreview,
  buildVisibleFixtureMatches
} from "@/lib/domain/fixture-preview";
import {
  canPublishFixture,
  canRegenerateFixtureManually,
  detectScheduleConflicts,
  type ScheduleConflict
} from "@/lib/domain/conflict-detector";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { fixtureStatusLabel } from "@/lib/utils";
import { RefereeAssignmentsPanel } from "./RefereeAssignmentsPanel";

export function FixtureGenerationPanel({
  data,
  activeEvent
}: {
  data: CompetitionData;
  activeEvent?: TournamentEvent | null;
}) {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState(activeEvent?.id ?? data.events[0]?.id ?? "");
  const [sendingFixtureEmail, setSendingFixtureEmail] = useState(false);
  const [regeneratingFixture, setRegeneratingFixture] = useState(false);
  const selectedEvent =
    activeEvent ??
    data.events.find((event) => event.id === selectedEventId) ??
    data.events[0] ??
    null;
  const scopedEvents = useMemo(() => {
    if (!selectedEvent) return [];
    return [selectedEvent];
  }, [selectedEvent]);
  const preview = useMemo(
    () => {
      if (!selectedEvent) return null;
      return buildEventFixturePreview({
        event: selectedEvent,
        teams: data.teams,
        matches: data.matches,
        venues: data.venues
      });
    },
    [data.matches, data.teams, data.venues, selectedEvent]
  );
  const visibleMatches = useMemo(
    () =>
      buildVisibleFixtureMatches({
        events: scopedEvents,
        teams: data.teams,
        matches: data.matches,
        venues: data.venues
      }),
    [data.matches, data.teams, data.venues, scopedEvents]
  );
  const scopedMatches = useMemo(() => {
    if (!selectedEvent) return [];
    return visibleMatches.filter((match) => match.eventId === selectedEvent.id);
  }, [selectedEvent, visibleMatches]);
  const scopedTeams = useMemo(() => {
    if (!selectedEvent) return [];
    return data.teams.filter((team) => team.eventId === selectedEvent.id);
  }, [data.teams, selectedEvent]);
  const scopedTeamIds = useMemo(() => new Set(scopedTeams.map((team) => team.id)), [scopedTeams]);
  const scopedPlayers = useMemo(() => {
    return data.players.filter((player) => scopedTeamIds.has(player.teamId));
  }, [data.players, scopedTeamIds]);
  const conflicts = detectScheduleConflicts({
    matches: scopedMatches,
    teams: scopedTeams,
    players: scopedPlayers,
    events: scopedEvents
  });
  const actionableConflicts = conflicts.filter((conflict) => conflict.severity !== "info");
  const activeTeamCount = scopedTeams.filter((team) =>
    isActiveRegistrationTeamStatus(team.status)
  ).length;
  const bracket = preview?.bracket ?? null;
  const previewSchedule = preview?.schedule ?? null;
  const configurationWarnings = selectedEvent
    ? buildConfigurationWarnings(selectedEvent, activeTeamCount)
    : [];
  const warnings = [...configurationWarnings, ...(bracket?.warnings ?? [])];

  async function handleRegenerateFixture() {
    if (!selectedEvent) return;

    setRegeneratingFixture(true);
    try {
      const response = await fetch("/api/admin/fixture-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEvent.id })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            matchCount?: number;
            preliminaryCount?: number;
          }
        | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo regenerar el fixture.");
        return;
      }

      toast.success(
        `Fixture regenerado: ${payload?.matchCount ?? 0} partido(s), ${payload?.preliminaryCount ?? 0} preliminar(es).`
      );
      router.refresh();
    } catch {
      toast.error("No se pudo regenerar el fixture.");
    } finally {
      setRegeneratingFixture(false);
    }
  }

  async function handleSendFixtureEmail() {
    if (!selectedEvent) return;

    setSendingFixtureEmail(true);
    try {
      const response = await fetch("/api/admin/fixture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEvent.id })
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        sent?: Array<{ email: string }>;
        failed?: Array<{ email: string; error: string }>;
        skipped?: string[];
      } | null;
      const sentCount = payload?.sent?.length ?? 0;
      const failedCount = payload?.failed?.length ?? 0;

      if (!response.ok && response.status !== 207) {
        toast.error(payload?.error ?? "No se pudo enviar el fixture.");
        return;
      }

      if (sentCount > 0 && failedCount === 0) {
        toast.success(`Fixture enviado a ${sentCount} correo(s).`);
        return;
      }

      if (sentCount > 0 && failedCount > 0) {
        toast.warning(`Fixture enviado a ${sentCount}; fallaron ${failedCount}.`);
        return;
      }

      toast.error(payload?.error ?? "No se envio ningun correo.");
    } catch {
      toast.error("No se pudo enviar el fixture.");
    } finally {
      setSendingFixtureEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Generar fixture"
          description="El admin configura criterios; el sistema genera llave, partidos, horarios y advertencias."
          action={
            <Badge tone={actionableConflicts.length > 0 ? "amber" : "green"}>
              {actionableConflicts.length} conflictos reales
            </Badge>
          }
        />
        {!activeEvent && data.events.length > 1 ? (
          <label className="mt-4 block max-w-xl">
            <span className="text-sm font-semibold text-ink/70">Campeonato</span>
            <select
              className="mt-1 min-h-10 w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-field focus:ring-2 focus:ring-field/20"
              value={selectedEvent?.id ?? ""}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedEvent ? (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Info label="Formato" value={formatLabel(selectedEvent.format)} />
            <Info label="Deporte" value={sportLabel(selectedEvent.sport)} />
            <Info label="Categoria" value={selectedEvent.category || "Por definir"} />
            <Info label="Estado fixture" value={fixtureStatusLabel(selectedEvent.fixtureStatus)} />
            <Info label="Equipos inscritos" value={`${activeTeamCount}/${selectedEvent.maxTeams}`} />
            <Info label="Maximo equipos" value={`${selectedEvent.maxTeams}`} />
            <Info label="Jugadores" value={`${selectedEvent.minPlayers}-${selectedEvent.maxPlayers} por equipo`} />
            <Info label="Fecha" value={dateLabel(selectedEvent.eventDate)} />
            <Info label="Cierre inscripcion" value={dateTimeLabel(selectedEvent.registrationOpenUntil)} />
            <Info label="Sembrado" value={seedingLabel(selectedEvent.seedingMode)} />
            <Info label="Byes" value={yesNo(selectedEvent.allowByes ?? false)} />
            <Info label="Tercer lugar" value={yesNo(selectedEvent.thirdPlace ?? false)} />
            <Info label="Penales" value={yesNo(selectedEvent.penaltiesEnabled ?? false)} />
            <Info label="Marcador publico" value={yesNo(selectedEvent.publicLiveScores ?? false)} />
            <Info label="Fixture compacto" value={yesNo(selectedEvent.fixtureCompactPreview ?? false)} />
            <Info label="Inicio" value={selectedEvent.scheduleConfig?.startTime ?? "09:00"} />
            <Info label="Duracion" value={`${selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20} min`} />
            <Info label="Medio tiempo" value={`Min ${selectedEvent.scheduleConfig?.halfTimeMinute ?? Math.floor((selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20) / 2)}`} />
            <Info label="Descanso" value={`${selectedEvent.scheduleConfig?.halfTimeBreakMinutes ?? 10} min`} />
            <Info label="Tolerancia inicio" value={`${selectedEvent.scheduleConfig?.matchStartToleranceMinutes ?? 15} min`} />
            <Info label="Pausa" value={`${selectedEvent.scheduleConfig?.transitionMinutes ?? 10} min`} />
            <Info label="Canchas" value={(selectedEvent.scheduleConfig?.courts ?? data.venues.map((venue) => venue.name)).join(", ")} />
            <Info label="Partidos" value={`${bracket?.matches.length ?? 0}`} />
            <Info label="Preliminar" value={bracketPreliminaryLabel(bracket)} />
            <Info label="Pasan directo" value={bracketDirectLabel(bracket)} />
            <Info label="Llave principal" value={bracketMainLabel(bracket)} />
          </div>
        ) : null}
        {warnings.length ? (
          <div className="mt-4 rounded-md border border-brand-yellow/70 bg-brand-yellow/25 p-3 text-sm font-bold text-brand-navy">
            {warnings.join(" ")}
          </div>
        ) : null}
        <ConflictSummary conflicts={conflicts} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={
              !selectedEvent ||
              regeneratingFixture ||
              !canRegenerateFixtureManually(selectedEvent.fixtureStatus ?? "draft_auto")
            }
            onClick={() => void handleRegenerateFixture()}
          >
            <Wand2 className="h-4 w-4" />
            {regeneratingFixture ? "Regenerando..." : "Regenerar preliminar"}
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || selectedEvent.fixtureStatus !== "draft_auto"}>
            <Snowflake className="h-4 w-4" />
            Congelar revision
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || !canPublishFixture(selectedEvent.fixtureStatus ?? "draft_auto")}>
            <Send className="h-4 w-4" />
            Publicar fixture
          </Button>
          <Button
            variant="highlight"
            disabled={!selectedEvent || scopedMatches.length === 0 || sendingFixtureEmail}
            onClick={() => void handleSendFixtureEmail()}
          >
            <Mail className="h-4 w-4" />
            {sendingFixtureEmail ? "Enviando..." : "Enviar fixture"}
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || selectedEvent.fixtureStatus === "locked"}>
            <Lock className="h-4 w-4" />
            Bloquear
          </Button>
          <span className="text-sm font-semibold text-brand-muted">
            {previewSchedule?.slots.length ?? 0} slots generados para la vista previa.
          </span>
        </div>
        {bracket ? (
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {bracket.rounds.map((round) => (
              <Info key={round.id} label={round.name} value={`${round.slots.length}`} />
            ))}
          </div>
        ) : null}
      </Card>
      <RefereeAssignmentsPanel
        events={scopedEvents}
        teams={scopedTeams}
        matches={scopedMatches}
      />
      <DaySchedule
        events={scopedEvents}
        teams={scopedTeams}
        players={scopedPlayers}
        matches={scopedMatches}
        venues={data.venues}
        initialEventId={selectedEvent?.id}
      />
    </div>
  );
}

function buildConfigurationWarnings(event: TournamentEvent, activeTeamCount: number) {
  const warnings: string[] = [];

  if (event.format === "single_elimination" && event.allowByes === false) {
    if (!isPowerOfTwo(event.maxTeams)) {
      warnings.push(
        `Configuracion incompatible: ${event.maxTeams} equipos maximos sin byes no arma una llave exacta; activa byes o usa 2, 4, 8, 16 o 32.`
      );
    }

    if (activeTeamCount >= 2 && activeTeamCount !== event.maxTeams && !isPowerOfTwo(activeTeamCount)) {
      warnings.push(
        `Con ${activeTeamCount} inscritos y byes desactivados tampoco se puede generar llave directa exacta.`
      );
    }
  }

  return warnings;
}

function isPowerOfTwo(value: number) {
  return value >= 2 && Number.isInteger(value) && (value & (value - 1)) === 0;
}

function formatLabel(format: TournamentEvent["format"]) {
  const labels: Record<TournamentEvent["format"], string> = {
    league: "Liga por puntos",
    single_elimination: "Eliminacion directa",
    groups_then_knockout: "Grupos + eliminacion"
  };

  return labels[format];
}

function sportLabel(sport: TournamentEvent["sport"]) {
  const labels: Record<TournamentEvent["sport"], string> = {
    futsal: "Futsal",
    futbol: "Futbol",
    voley: "Voley"
  };

  return labels[sport];
}

function seedingLabel(value: TournamentEvent["seedingMode"]) {
  const labels: Record<NonNullable<TournamentEvent["seedingMode"]>, string> = {
    registration_order: "Orden de inscripcion",
    random: "Sorteo aleatorio",
    manual: "Manual",
    ranking: "Ranking previo"
  };

  return value ? labels[value] : "Orden de inscripcion";
}

function yesNo(value: boolean) {
  return value ? "Si" : "No";
}

function dateLabel(value?: string) {
  if (!value) return "Por definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima"
  }).format(date);
}

function dateTimeLabel(value?: string) {
  if (!value) return "Por definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima"
  }).format(date);
}

function ConflictSummary({ conflicts }: { conflicts: ScheduleConflict[] }) {
  const actionable = conflicts.filter((conflict) => conflict.severity !== "info");
  const infos = conflicts.filter((conflict) => conflict.severity === "info");

  if (actionable.length === 0 && infos.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-field/15 bg-field/10 p-3 text-sm font-semibold text-field">
        Sin choques de cancha, equipo, jugador ni descanso para este campeonato.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      {actionable.length === 0 ? (
        <div className="rounded-md border border-field/15 bg-field/10 p-3 text-sm font-semibold text-field">
          Sin conflictos reales de horario. Los avisos siguientes son informativos.
        </div>
      ) : null}
      {actionable.map((conflict, index) => (
        <div
          key={`${conflict.type}-${index}`}
          className="rounded-md border border-amber-400/25 bg-amber-100 p-3 text-sm text-amber-950"
        >
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            {conflict.message}
          </p>
          <p className="mt-1 text-amber-900">{conflict.suggestion}</p>
        </div>
      ))}
      {infos.map((conflict, index) => (
        <div
          key={`${conflict.type}-${index}`}
          className="rounded-md border border-sky/25 bg-sky/10 p-3 text-sm text-sky-950"
        >
          <p className="flex items-center gap-2 font-bold">
            <InfoIcon className="h-4 w-4" />
            {conflict.message}
          </p>
          <p className="mt-1 text-sky-900">{conflict.suggestion}</p>
        </div>
      ))}
    </div>
  );
}

function bracketPreliminaryLabel(bracket: GeneratedBracket | null) {
  if (!bracket || bracket.status === "incomplete") return "Pendiente";
  if (bracket.preliminaryMatches === 0) return "No aplica";
  return `${bracket.preliminaryMatches} partido(s), ${bracket.preliminaryTeams} equipos`;
}

function bracketDirectLabel(bracket: GeneratedBracket | null) {
  if (!bracket || bracket.status === "incomplete") return "Pendiente";
  return `${bracket.byeCount} equipo(s) con bye`;
}

function bracketMainLabel(bracket: GeneratedBracket | null) {
  if (!bracket || bracket.status === "incomplete") return "Pendiente";
  return `${bracket.lowerPowerOfTwo} clasificados`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-brand-towerMid/25 bg-white p-3 shadow-insetLine">
      <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
