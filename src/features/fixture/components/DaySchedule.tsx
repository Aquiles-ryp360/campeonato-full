"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import type { Category, Match, Player, Team, TournamentEvent, Venue } from "@/lib/types";
import { conflictsForMatch, detectScheduleConflicts } from "@/lib/domain/conflict-detector";
import { filterMatchesByCategory } from "@/lib/domain/categories";
import { Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { TeamDetailsModal } from "@/features/public/components/TeamDetailsModal";
import { MatchDetailsModal } from "@/features/public/components/MatchDetailsModal";
import { MatchCard } from "./MatchCard";
import { CourtTimeline } from "./CourtTimeline";

export function DaySchedule({
  events,
  categories,
  teams,
  players,
  matches,
  venues,
  initialEventId,
  initialCategoryId
}: {
  events: TournamentEvent[];
  categories: Category[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  venues: Venue[];
  initialEventId?: string;
  initialCategoryId?: string;
}) {
  const [eventId, setEventId] = useState(initialEventId ?? "all");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "all");
  const [court, setCourt] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"hour" | "court">("hour");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const selectedEventCategories = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            (eventId === "all" || category.eventId === eventId) &&
            category.active &&
            category.published
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories, eventId]
  );
  const filteredMatches = useMemo(() => {
    const eventMatches = matches.filter((match) => eventId === "all" || match.eventId === eventId);
    const teamMatches =
      categoryId === "all"
        ? eventMatches
        : filterMatchesByCategory(
            eventMatches,
            teams.filter((team) => eventId === "all" || team.eventId === eventId),
            categoryId
          );

    return teamMatches
      .filter((match) => court === "all" || match.court === court)
      .filter(
        (match) =>
          teamId === "all" || match.homeTeamId === teamId || match.awayTeamId === teamId
      )
      .filter((match) => status === "all" || match.status === status)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [categoryId, court, eventId, matches, status, teamId, teams]);

  const conflicts = useMemo(
    () => detectScheduleConflicts({ matches, teams, players, events }),
    [events, matches, players, teams]
  );
  const courts = Array.from(new Set(matches.map((match) => match.court))).sort();
  const selectedEvent = events.find((event) => event.id === selectedTeam?.eventId) ?? null;

  useEffect(() => {
    if (!selectedEventCategories.some((category) => category.id === categoryId)) {
      setCategoryId(selectedEventCategories[0]?.id ?? "all");
    }
  }, [categoryId, selectedEventCategories]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Fixture del dia"
          title="Linea de tiempo de partidos"
          description="Filtra por campeonato, cancha, equipo o estado sin navegar a menus separados."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <Field label="Campeonato">
            <select className={inputClass} value={eventId} onChange={(event) => setEventId(event.target.value)}>
              <option value="all">Todos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria">
            <select
              className={inputClass}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="all">Todas</option>
              {selectedEventCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cancha">
            <select className={inputClass} value={court} onChange={(event) => setCourt(event.target.value)}>
              <option value="all">Todas</option>
              {courts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {venues
                .filter((venue) => !courts.includes(venue.name))
                .map((venue) => (
                  <option key={venue.id} value={venue.name}>
                    {venue.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Equipo">
            <select className={inputClass} value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="all">Todos</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todos</option>
              <option value="scheduled">Programado</option>
              <option value="finished">Finalizado</option>
              <option value="walkover">W.O.</option>
              <option value="postponed">Pospuesto</option>
            </select>
          </Field>
          <Field label="Vista">
            <div className="grid grid-cols-2 rounded-md border border-ink/10 bg-white p-1">
              {(["hour", "court"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`inline-flex min-h-8 items-center justify-center gap-1 rounded px-2 text-sm font-semibold ${
                    view === mode ? "bg-ink text-white" : "text-ink/65 hover:bg-mist"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {mode === "hour" ? "Hora" : "Cancha"}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      {filteredMatches.length > 0 ? (
        view === "hour" ? (
          <div className="space-y-5">
            {Array.from(new Set(filteredMatches.map((match) => timeKey(match.scheduledAt)))).map((time) => (
              <section key={time} className="grid gap-3 rounded-md border border-ink/10 bg-white/70 p-4 lg:grid-cols-[90px_1fr]">
                <div>
                  <p className="text-2xl font-bold text-ink">{time}</p>
                  <p className="text-xs font-semibold uppercase text-ink/45">Hora</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredMatches
                    .filter((match) => timeKey(match.scheduledAt) === time)
                    .map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        event={events.find((event) => event.id === match.eventId)}
                        teams={teams}
                        conflicts={conflictsForMatch(conflicts, match.id)}
                        onOpenTeam={setSelectedTeam}
                        onOpenMatch={setSelectedMatch}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {Array.from(new Set(filteredMatches.map((match) => match.court))).map((currentCourt) => (
              <CourtTimeline
                key={currentCourt}
                court={currentCourt}
                matches={filteredMatches.filter((match) => match.court === currentCourt)}
                events={events}
                teams={teams}
                conflicts={conflicts}
                onOpenTeam={setSelectedTeam}
                onOpenMatch={setSelectedMatch}
              />
            ))}
          </div>
        )
      ) : (
        <Card className="p-8 text-center text-sm text-ink/55">
          No hay partidos para los filtros seleccionados.
        </Card>
      )}

      <TeamDetailsModal
        team={selectedTeam}
        event={selectedEvent}
        players={players.filter((player) => player.teamId === selectedTeam?.id)}
        matches={matches}
        teams={teams}
        onClose={() => setSelectedTeam(null)}
      />
      <MatchDetailsModal match={selectedMatch} teams={teams} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}

function timeKey(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima"
  }).format(new Date(value));
}
