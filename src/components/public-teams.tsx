"use client";

import { useState } from "react";
import { CalendarDays, ShieldCheck, UsersRound } from "lucide-react";
import { events, matches, players, teams } from "@/lib/mock-data";
import type { Team } from "@/lib/types";
import { formatDateTime, getTeamName, sportLabel, teamStatusLabel } from "@/lib/utils";
import { Badge, Card, Metric, SectionHeader } from "./ui";

export function PublicTeams() {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const eventTeams = teams.filter((team) => team.eventId === eventId);
  const [selectedTeamId, setSelectedTeamId] = useState(eventTeams[0]?.id ?? teams[0]?.id ?? "");
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? eventTeams[0] ?? null;
  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];

  function chooseEvent(nextEventId: string) {
    setEventId(nextEventId);
    setSelectedTeamId(teams.find((team) => team.eventId === nextEventId)?.id ?? "");
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Publico"
        title="Equipos inscritos"
        description="Lista de equipos por campeonato. Selecciona uno para ver datos basicos, jugadores registrados y horarios."
      />

      <Card className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => chooseEvent(event.id)}
              className={`min-w-[220px] rounded-md border px-4 py-3 text-left transition ${
                event.id === eventId
                  ? "border-field bg-field/10"
                  : "border-ink/10 bg-white hover:bg-mist"
              }`}
            >
              <p className="font-bold text-ink">{event.name}</p>
              <p className="mt-1 text-xs text-ink/58">
                {sportLabel(event.sport)} · {event.category}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Campeonato" value={selectedEvent.name} icon={ShieldCheck} />
        <Metric label="Equipos" value={`${eventTeams.length}/${selectedEvent.maxTeams}`} icon={UsersRound} tone="blue" />
        <Metric label="Estado" value={selectedEvent.status === "registration" ? "Inscripciones" : "Activo"} icon={CalendarDays} tone="amber" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <SectionHeader title="Lista de equipos" />
          <div className="mt-4 space-y-3">
            {eventTeams.length > 0 ? (
              eventTeams.map((team) => (
                <TeamListItem
                  key={team.id}
                  team={team}
                  active={team.id === selectedTeam?.id}
                  onClick={() => setSelectedTeamId(team.id)}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55">
                Todavia no hay equipos inscritos en este campeonato.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Detalle del equipo" description="Solo se muestra lo necesario para el publico." />
          {selectedTeam ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-md border border-ink/10 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge tone={selectedTeam.status === "approved" ? "green" : "amber"}>
                      {teamStatusLabel(selectedTeam.status)}
                    </Badge>
                    <h3 className="mt-3 text-2xl font-bold text-ink">{selectedTeam.name}</h3>
                    <p className="mt-1 text-sm text-ink/58">
                      Delegado: {selectedTeam.delegateName}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span
                      className="h-9 w-9 rounded-md border border-ink/10"
                      style={{ backgroundColor: selectedTeam.primaryColor }}
                    />
                    <span
                      className="h-9 w-9 rounded-md border border-ink/10"
                      style={{ backgroundColor: selectedTeam.secondaryColor }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <p className="font-bold text-ink">Jugadores registrados</p>
                  <p className="mt-1 text-sm text-ink/55">
                    {players.filter((player) => player.teamId === selectedTeam.id).length} jugadores
                  </p>
                  <div className="mt-3 space-y-2">
                    {players
                      .filter((player) => player.teamId === selectedTeam.id)
                      .slice(0, 6)
                      .map((player) => (
                        <p key={player.id} className="text-sm text-ink/70">
                          {player.firstName} {player.lastName} · {player.semester}
                        </p>
                      ))}
                  </div>
                </div>

                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <p className="font-bold text-ink">Partidos</p>
                  <div className="mt-3 space-y-3">
                    {matches
                      .filter(
                        (match) =>
                          match.homeTeamId === selectedTeam.id ||
                          match.awayTeamId === selectedTeam.id
                      )
                      .map((match) => (
                        <div key={match.id} className="text-sm text-ink/70">
                          <p className="font-semibold text-ink">
                            {getTeamName(teams, match.homeTeamId)} vs {getTeamName(teams, match.awayTeamId)}
                          </p>
                          <p className="text-xs text-ink/55">
                            {formatDateTime(match.scheduledAt)} · {match.court}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55">
              Selecciona un campeonato con equipos.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function TeamListItem({
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
      className={`w-full rounded-md border p-4 text-left transition ${
        active ? "border-field bg-field/10" : "border-ink/10 bg-white hover:border-field"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-ink">{team.name}</p>
        <Badge tone={team.status === "approved" ? "green" : "amber"}>
          {teamStatusLabel(team.status)}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-ink/55">Delegado: {team.delegateName}</p>
    </button>
  );
}
