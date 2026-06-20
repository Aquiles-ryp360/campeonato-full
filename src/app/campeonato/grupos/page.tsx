import { getPublicCompetitionData } from "@/lib/supabase-data";
import {
  events as mockEvents,
  groups as mockGroups,
  groupTeams as mockGroupTeams,
  groupStandings as mockGroupStandings,
  teams as mockTeams
} from "@/lib/mock-data";
import { PublicShell } from "@/components/shell";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { UsersRound, Trophy, ListTodo } from "lucide-react";
import { getTeamName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const data = await getPublicCompetitionData();
  const events = data.events && data.events.length > 0 ? data.events : mockEvents;
  const groups = data.groups && data.groups.length > 0 ? data.groups : mockGroups;
  const groupTeams = data.groupTeams && data.groupTeams.length > 0 ? data.groupTeams : mockGroupTeams;
  const groupStandings = data.groupStandings && data.groupStandings.length > 0 ? data.groupStandings : mockGroupStandings;
  const teams = data.teams && data.teams.length > 0 ? data.teams : mockTeams;

  // Filtrar eventos que son de formato 'groups_then_knockout' (Grupos + eliminación)
  const groupEvents = events.filter((e) => {
    // Si es mock event, formatId es 'format-groups'
    return e.formatId === "format-groups" || e.formatId === "groups_then_knockout";
  });

  return (
    <PublicShell>
      <div className="space-y-6 pb-20 md:pb-0">
        <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">Posiciones</Badge>
            <Badge tone="dark">Grupos de Competición</Badge>
          </div>
          <div className="mt-7">
            <h1 className="text-3xl font-bold sm:text-5xl">Fase de Grupos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Resultados, puntajes y clasificación oficial de los equipos distribuidos por grupos en los torneos activos.
            </p>
          </div>
        </section>

        {groupEvents.length > 0 ? (
          groupEvents.map((event) => {
            const eventGroups = groups.filter((g) => g.eventId === event.id);

            return (
              <div key={event.id} className="space-y-6">
                <Card className="p-4 border-l-4 border-l-field">
                  <h2 className="text-xl font-bold text-ink">{event.name}</h2>
                  <p className="text-xs text-ink/55 mt-1">
                    {event.category} · Máximo {event.maxTeams} equipos · Clasifican los 2 mejores de cada grupo
                  </p>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  {eventGroups.length > 0 ? (
                    eventGroups.map((group) => {
                      const groupStandingsRows = groupStandings
                        .filter((gs) => gs.groupId === group.id)
                        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

                      return (
                        <Card key={group.id} className="overflow-hidden">
                          <div className="bg-mist p-4 border-b border-ink/10 flex items-center justify-between">
                            <h3 className="font-bold text-ink text-lg flex items-center gap-2">
                              <UsersRound className="h-5 w-5 text-field" />
                              {group.name}
                            </h3>
                            <Badge tone="green">Fase Clasificatoria</Badge>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px] text-sm text-left">
                              <thead className="bg-white/50 text-xs uppercase text-ink/55 border-b border-ink/8">
                                <tr>
                                  <th className="px-4 py-3">Equipo</th>
                                  <th className="px-2 py-3 text-center">PJ</th>
                                  <th className="px-2 py-3 text-center">PG</th>
                                  <th className="px-2 py-3 text-center">PE</th>
                                  <th className="px-2 py-3 text-center">PP</th>
                                  <th className="px-2 py-3 text-center">DG</th>
                                  <th className="px-4 py-3 text-center">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-ink/8">
                                {groupStandingsRows.length > 0 ? (
                                  groupStandingsRows.map((row, index) => {
                                    const teamName = getTeamName(teams, row.teamId);
                                    const isQualified = index < 2; // Clasifican los 2 primeros

                                    return (
                                      <tr key={row.id} className={isQualified ? "bg-field/5" : "bg-white"}>
                                        <td className="px-4 py-3 font-semibold flex items-center gap-2">
                                          <span className={`text-xs w-5 h-5 rounded-full grid place-items-center font-bold ${
                                            isQualified ? "bg-field text-white" : "bg-ink/10 text-ink/55"
                                          }`}>
                                            {index + 1}
                                          </span>
                                          <span className="truncate">{teamName}</span>
                                        </td>
                                        <td className="px-2 py-3 text-center font-medium">{row.played}</td>
                                        <td className="px-2 py-3 text-center text-green-700">{row.won}</td>
                                        <td className="px-2 py-3 text-center text-ink/65">{row.drawn}</td>
                                        <td className="px-2 py-3 text-center text-red-600">{row.lost}</td>
                                        <td className="px-2 py-3 text-center font-mono">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                                        <td className="px-4 py-3 text-center font-bold text-ink">{row.points}</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-ink/55">
                                      No hay estadísticas cargadas para este grupo.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-8 text-sm text-ink/55">
                      No hay grupos configurados para este torneo.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <Card className="p-8 text-center text-ink/55">
            <Trophy className="h-12 w-12 mx-auto text-ink/20 mb-3" />
            <p className="font-bold">Sin torneos con fase de grupos</p>
            <p className="text-sm mt-1">Actualmente no existen campeonatos con el formato de Fase de Grupos activos.</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
