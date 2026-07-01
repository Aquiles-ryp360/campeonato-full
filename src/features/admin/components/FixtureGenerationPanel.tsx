"use client";

import { useMemo } from "react";
import { Lock, Send, Snowflake, Wand2 } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import { generateOneDaySchedule } from "@/lib/domain/schedule-generator";
import {
  canPublishFixture,
  canRegenerateFixtureManually,
  detectScheduleConflicts
} from "@/lib/domain/conflict-detector";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { fixtureStatusLabel } from "@/lib/utils";

export function FixtureGenerationPanel({ data }: { data: CompetitionData }) {
  const selectedEvent = data.events[0] ?? null;
  const bracket = useMemo(
    () => {
      if (!selectedEvent) return null;
      const eventTeams = data.teams.filter((team) => team.eventId === selectedEvent.id);
      return generateKnockoutBracket({
        eventId: selectedEvent.id,
        teams: eventTeams,
        matches: data.matches.filter((match) => match.eventId === selectedEvent.id),
        thirdPlace: selectedEvent.thirdPlace ?? true,
        seedingMode: selectedEvent.seedingMode ?? "registration_order",
        fixtureStatus: selectedEvent.fixtureStatus ?? "draft_auto"
      });
    },
    [data.matches, data.teams, selectedEvent]
  );
  const previewSchedule = useMemo(() => {
    if (!selectedEvent || !bracket) return null;
    return generateOneDaySchedule(bracket.matches, {
      eventDate: selectedEvent.eventDate ?? data.matches[0]?.scheduledAt ?? new Date().toISOString(),
      startTime: selectedEvent.scheduleConfig?.startTime ?? "09:00",
      matchDurationMinutes: selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20,
      transitionMinutes: selectedEvent.scheduleConfig?.transitionMinutes ?? 10,
      courts: selectedEvent.scheduleConfig?.courts ?? data.venues.map((venue) => venue.name),
      minimumRestMinutes: selectedEvent.minimumRestMinutes,
      respectRoundDependencies: true,
      allowCompactPreview: selectedEvent.fixtureCompactPreview ?? true
    });
  }, [bracket, data.matches, data.venues, selectedEvent]);
  const conflicts = detectScheduleConflicts({
    matches: data.matches,
    teams: data.teams,
    players: data.players,
    events: data.events
  });

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
            <Info label="Pausa" value={`${selectedEvent.scheduleConfig?.transitionMinutes ?? 10} min`} />
            <Info label="Canchas" value={(selectedEvent.scheduleConfig?.courts ?? data.venues.map((venue) => venue.name)).join(", ")} />
            <Info label="Partidos" value={`${bracket?.matches.length ?? 0}`} />
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
      <DaySchedule
        events={data.events}
        teams={data.teams}
        players={data.players}
        matches={data.matches}
        venues={data.venues}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-3">
      <p className="text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
