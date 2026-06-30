"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog, Lock, RefreshCw, Send, Snowflake } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import { filterMatchesByCategory } from "@/lib/domain/categories";
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
  const [referees, setReferees] = useState<Array<{ id: string; full_name: string; active: boolean }>>([]);
  const selectedEvent = useMemo(
    () =>
      data.events.find((event) => event.sport === "futbol" || event.name.toLowerCase().includes("futbol 11")) ??
      data.events[0] ??
      null,
    [data.events]
  );
  const eventCategories = useMemo(
    () =>
      data.categories
        .filter((category) => category.eventId === selectedEvent?.id && category.active && category.published)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [data.categories, selectedEvent?.id]
  );
  const [categoryId, setCategoryId] = useState("");
  const selectedCategory = eventCategories.find((category) => category.id === categoryId) ?? eventCategories[0] ?? null;
  const eventTeams = useMemo(
    () =>
      selectedEvent
        ? data.teams.filter(
            (team) =>
              team.eventId === selectedEvent.id &&
              (selectedCategory ? team.categoryId === selectedCategory.id : true)
          )
        : [],
    [data.teams, selectedCategory, selectedEvent]
  );
  const drawableTeams = useMemo(
    () => eventTeams.filter((team) => team.status === "approved" && team.paymentStatus === "approved"),
    [eventTeams]
  );
  const eventMatches = useMemo(
    () =>
      selectedEvent
        ? filterMatchesByCategory(
            data.matches.filter((match) => match.eventId === selectedEvent.id),
            data.teams.filter((team) => team.eventId === selectedEvent.id),
            selectedCategory?.id
          )
        : [],
    [data.matches, data.teams, selectedCategory?.id, selectedEvent]
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

  useEffect(() => {
    setCategoryId(eventCategories[0]?.id ?? "");
  }, [eventCategories]);

  useEffect(() => {
    fetch("/api/admin/referees")
      .then((response) => response.json())
      .then((payload) => setReferees(payload.ok ? payload.referees : []))
      .catch(() => setReferees([]));
  }, []);

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
          eventId: selectedEvent.id,
          categoryId: selectedCategory?.id
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; matchCount: number }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload && !payload.ok ? payload.error : "No se pudo guardar la programacion.");
        return;
      }

      toast.success(`Programacion guardada: ${payload.matchCount} partidos generados.`);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor para programar.");
    } finally {
      setIsDrawing(false);
    }
  }

  async function assignReferee(matchId: string, refereeId: string) {
    if (!refereeId) return;
    const response = await fetch(`/api/admin/matches/${matchId}/referees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refereeId })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      toast.error(payload?.error ?? "No se pudo asignar el arbitro.");
      return;
    }
    toast.success("Arbitro asignado.");
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Programacion automatica"
          description="Genera partidos por campeonato, deporte, categoria, cancha asignada y horario disponible."
          action={<Badge tone={conflicts.length > 0 ? "amber" : "green"}>{conflicts.length} conflictos</Badge>}
        />
        {selectedEvent ? (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Info label="Estado" value={fixtureStatusLabel(selectedEvent.fixtureStatus)} />
            <Info label="Inicio" value={selectedEvent.scheduleConfig?.startTime ?? "09:00"} />
            <Info label="Duracion" value={`${selectedEvent.scheduleConfig?.matchDurationMinutes ?? 20} min`} />
            <Info label="Canchas" value={(selectedEvent.scheduleConfig?.courts ?? data.venues.map((venue) => venue.name)).join(", ")} />
            <Info label="Categoria" value={selectedCategory?.name ?? "Todas"} />
            <Info label="Partidos" value={hasOfficialDraw ? `${eventMatches.length}` : "Pendiente"} />
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink"
            value={selectedCategory?.id ?? ""}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={eventCategories.length === 0}
            aria-label="Categoria de programacion"
          >
            <option value="">Todas las categorias</option>
            {eventCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Button
            onClick={drawFixture}
            disabled={
              !selectedEvent ||
              drawableTeams.length < 2 ||
              isDrawing ||
              selectedEvent.fixtureStatus === "locked" ||
              eventMatches.some((match) => match.status === "validated" || match.status === "finished")
            }
          >
            {isDrawing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarCog className="h-4 w-4" />}
            {hasOfficialDraw ? "Regenerar programacion" : "Generar programacion"}
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
              ? "Programacion visible para delegados y publico."
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
                  <p className="mt-1 text-xs text-ink/55">{team.status} · pago {team.paymentStatus}</p>
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
        categories={data.categories}
        teams={data.teams}
        players={data.players}
        matches={data.matches}
        venues={data.venues}
        initialEventId={selectedEvent?.id}
        initialCategoryId={selectedCategory?.id}
      />
      {eventMatches.length > 0 ? (
        <Card className="p-5">
          <SectionHeader title="Asignar arbitros" description="Asigna arbitro principal a partidos generados." />
          <div className="mt-4 grid gap-3">
            {eventMatches.map((match) => (
              <div key={match.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-3 md:grid-cols-[1fr_260px] md:items-center">
                <p className="text-sm font-semibold text-ink">{match.label ?? `Partido ${match.round}`} · {match.court}</p>
                <select
                  className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink"
                  defaultValue=""
                  onChange={(event) => void assignReferee(match.id, event.target.value)}
                >
                  <option value="">Asignar arbitro</option>
                  {referees.filter((referee) => referee.active).map((referee) => (
                    <option key={referee.id} value={referee.id}>{referee.full_name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
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
