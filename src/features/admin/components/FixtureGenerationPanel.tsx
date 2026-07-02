"use client";

import { useMemo } from "react";
import { Lock, Send, Snowflake, Wand2 } from "lucide-react";
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
  detectScheduleConflicts
} from "@/lib/domain/conflict-detector";
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
  const selectedEvent = activeEvent ?? data.events[0] ?? null;
  const scopedEvents = useMemo(() => {
    if (!selectedEvent) return data.events;
    if (activeEvent) return [selectedEvent];
    return data.events;
  }, [activeEvent, data.events, selectedEvent]);
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
    if (!activeEvent || !selectedEvent) return visibleMatches;
    return visibleMatches.filter((match) => match.eventId === selectedEvent.id);
  }, [activeEvent, selectedEvent, visibleMatches]);
  const scopedTeams = useMemo(() => {
    if (!activeEvent || !selectedEvent) return data.teams;
    return data.teams.filter((team) => team.eventId === selectedEvent.id);
  }, [activeEvent, data.teams, selectedEvent]);
  const scopedTeamIds = useMemo(() => new Set(scopedTeams.map((team) => team.id)), [scopedTeams]);
  const scopedPlayers = useMemo(() => {
    if (!activeEvent) return data.players;
    return data.players.filter((player) => scopedTeamIds.has(player.teamId));
  }, [activeEvent, data.players, scopedTeamIds]);
  const conflicts = detectScheduleConflicts({
    matches: scopedMatches,
    teams: scopedTeams,
    players: scopedPlayers,
    events: scopedEvents
  });
  const bracket = preview?.bracket ?? null;
  const previewSchedule = preview?.schedule ?? null;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Generar fixture"
          description="El admin configura criterios; el sistema genera llave, partidos, horarios y advertencias."
          action={<Badge tone={conflicts.length > 0 ? "amber" : "green"}>{conflicts.length} conflictos</Badge>}
        />
        {selectedEvent ? (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Info label="Estado" value={fixtureStatusLabel(selectedEvent.fixtureStatus)} />
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
        {bracket?.warnings.length ? (
          <div className="mt-4 rounded-md border border-amber-400/25 bg-amber-100 p-3 text-sm font-semibold text-amber-900">
            {bracket.warnings.join(" ")}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={!selectedEvent || !canRegenerateFixtureManually(selectedEvent.fixtureStatus ?? "draft_auto")}>
            <Wand2 className="h-4 w-4" />
            Regenerar preliminar
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || selectedEvent.fixtureStatus !== "draft_auto"}>
            <Snowflake className="h-4 w-4" />
            Congelar revision
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || !canPublishFixture(selectedEvent.fixtureStatus ?? "draft_auto")}>
            <Send className="h-4 w-4" />
            Publicar fixture
          </Button>
          <Button variant="secondary" disabled={!selectedEvent || selectedEvent.fixtureStatus === "locked"}>
            <Lock className="h-4 w-4" />
            Bloquear
          </Button>
          <span className="text-sm text-ink/60">
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
    <div className="rounded-md border border-ink/10 bg-white p-3">
      <p className="text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
