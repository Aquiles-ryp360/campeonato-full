"use client";

import { CalendarDays, FileText, UserPlus, UsersRound } from "lucide-react";
import type { TournamentEvent } from "@/lib/types";
import { eventStatusLabel, fixtureStatusLabel } from "@/lib/utils";
import {
  championshipSlug,
  eventStatusTone,
  sportDisplayName,
  tournamentFormatLabel
} from "@/lib/domain/tournament-format";
import { Badge, Button } from "@/components/ui";
import { ChampionshipSwitcher } from "./ChampionshipSwitcher";

export function ChampionshipHero({
  event,
  events,
  teamCount,
  courts,
  onChangeEvent
}: {
  event: TournamentEvent;
  events: TournamentEvent[];
  teamCount: number;
  courts: string[];
  onChangeEvent: (eventId: string) => void;
}) {
  const slug = championshipSlug(event);

  return (
    <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="dark">{sportDisplayName(event)}</Badge>
        <Badge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</Badge>
        <Badge tone="amber">{fixtureStatusLabel(event.fixtureStatus)}</Badge>
        <Badge tone="dark">{tournamentFormatLabel(event.format)}</Badge>
      </div>

      <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="text-3xl font-bold sm:text-5xl">{event.name}</h1>
            <ChampionshipSwitcher events={events} value={event.id} onChange={onChangeEvent} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
            {event.rulesSummary || "Campeonato deportivo configurable con fixture, bases e inscripciones."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-white/70">
            <span>{teamCount}/{event.maxTeams} equipos</span>
            <span>Cierre: {new Date(event.registrationOpenUntil).toLocaleDateString("es-PE")}</span>
            <span>{courts.length > 0 ? courts.join(", ") : "Canchas por confirmar"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button href={`/c/${slug}/fixture`} variant="secondary">
            <CalendarDays className="h-4 w-4" />
            Fixture del dia
          </Button>
          <Button href={`/c/${slug}/bases`} variant="secondary">
            <FileText className="h-4 w-4" />
            Bases
          </Button>
          <Button href={`/c/${slug}/registro`} variant="secondary">
            <UserPlus className="h-4 w-4" />
            Inscribir equipo
          </Button>
          <Button href="#equipos-inscritos" variant="ghost" className="bg-white/10 text-white hover:bg-white/15">
            <UsersRound className="h-4 w-4" />
            Equipos inscritos
          </Button>
        </div>
      </div>
    </section>
  );
}
