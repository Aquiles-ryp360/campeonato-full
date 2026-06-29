"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, RefreshCw, Send, Shuffle, Snowflake } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import { generateOneDaySchedule } from "@/lib/domain/schedule-generator";
import {
  canPublishFixture,
  detectScheduleConflicts
} from "@/lib/domain/conflict-detector";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DaySchedule } from "@/features/fixture/components/DaySchedule";
import { fixtureStatusLabel } from "@/lib/utils";

export function FixtureGenerationPanel({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const [isDrawing, setIsDrawing] = useState(false);
  const selectedEvent = useMemo(
    () =>
      data.events.find((event) => event.sport === "futbol" || event.name.toLowerCase().includes("futbol 11")) ??
      data.events[0] ??
      null,
    [data.events]
  );
  const eventTeams = useMemo(
    () => (selectedEvent ? data.teams.filter((team) => team.eventId === selectedEvent.id) : []),
    [data.teams, selectedEvent]
  );
  const drawableTeams = useMemo(
    () => eventTeams.filter((team) => team.status === "approved"),
    [eventTeams]
  );
  const eventMatches = useMemo(
    () => (selectedEvent ? data.matches.filter((match) => match.eventId === selectedEvent.id) : []),
    [data.matches, selectedEvent]
  );
  const hasOfficialDraw = eventMatches.some((match) => match.stage !== "group_stage");
  const bracket = useMemo(
    () => {
      if (!selectedEvent) return null;
      return generateKnockoutBracket({
        eventId: selectedEvent.id,
        teams: drawableTeams,
        matches: eventMatches,
        thirdPlace: selectedEvent.thirdPlace ?? true,
        seedingMode: hasOfficialDraw ? selectedEvent.seedingMode ?? "registration_order" : "random",
        randomSeed: hasOfficialDraw ? undefined : "admin-preview",
        fixtureStatus: selectedEvent.fixtureStatus ?? "draft_auto"
      });
    },
    [drawableTeams, eventMatches, hasOfficialDraw, selectedEvent]
  );
  const previewSchedule = useMemo(() => {
    if (!selectedEvent || !bracket) return null;
    return generateOneDaySchedule(bracket.matches, {
      eventDate: selectedEvent.eventDate ?? data.matches[0]?.scheduledAt ?? new Date().toISOString(),
      startTime: selectedEvent.scheduleConfig?.startTime ?? "09:00",
      matchDurationMinutes: selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20,
      transitionMinutes: selectedEvent.scheduleConfig?.transitionMinutes ?? 0,
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

  async function drawFixture() {
    if (!selectedEvent) return;

    setIsDrawing(true);
    try {
      const response = await fetch("/api/admin/draw-fixture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: selectedEvent.id
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; matchCount: number }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload && !payload.ok ? payload.error : "No se pudo guardar el sorteo.");
        return;
      }

      toast.success(`Sorteo guardado: ${payload.matchCount} partidos generados.`);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor para sortear.");
    } finally {
      setIsDrawing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Sorteo de llaves"
          description="Solo el administrador genera las llaves. Delegados y publico solo ven el resultado guardado."
          action={<Badge tone={conflicts.length > 0 ? "amber" : "green"}>{conflicts.length} conflictos</Badge>}
        />
        {selectedEvent ? (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Info label="Estado" value={fixtureStatusLabel(selectedEvent.fixtureStatus)} />
            <Info label="Inicio" value={selectedEvent.scheduleConfig?.startTime ?? "09:00"} />
            <Info label="Duracion" value={`${selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20} min`} />
            <Info label="Canchas" value={(selectedEvent.scheduleConfig?.courts ?? data.venues.map((venue) => venue.name)).join(", ")} />
            <Info label="Partidos" value={hasOfficialDraw ? `${eventMatches.length}` : "Pendiente"} />
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={drawFixture}
            disabled={
              !selectedEvent ||
              drawableTeams.length < 2 ||
              isDrawing ||
              selectedEvent.fixtureStatus === "locked" ||
              eventMatches.some((match) => match.status === "finished")
            }
          >
            {isDrawing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            {hasOfficialDraw ? "Volver a sortear" : "Sortear llaves"}
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
            {hasOfficialDraw
              ? "Llaves visibles para delegados y publico."
              : `${previewSchedule?.slots.length ?? 0} slots de vista previa antes de guardar.`}
          </span>
        </div>
        <div className="mt-5">
          <p className="text-sm font-bold text-ink">Equipos inscritos</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {eventTeams.length > 0 ? (
              eventTeams.map((team) => (
                <div key={team.id} className="rounded-md border border-ink/10 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
                    <p className="truncate text-sm font-bold text-ink">{team.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">{team.status}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-ink/20 p-4 text-sm text-ink/55 sm:col-span-2 lg:col-span-4">
                Todavia no hay equipos inscritos.
              </div>
            )}
          </div>
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
