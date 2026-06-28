import { getPublicCompetitionData } from "@/lib/supabase-data";
import {
  matches as mockMatches,
  teams as mockTeams,
  venues as mockVenues,
  events as mockEvents
} from "@/lib/mock-data";
import { PublicShell } from "@/components/shell";
import { Card, Badge } from "@/components/ui";
import { Calendar, MapPin, Clock } from "lucide-react";
import { formatDateTime, getTeamName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FixturePage() {
  const data = await getPublicCompetitionData();
  const matches = data.matches && data.matches.length > 0 ? data.matches : mockMatches;
  const teams = data.teams && data.teams.length > 0 ? data.teams : mockTeams;
  const venues = data.venues && data.venues.length > 0 ? data.venues : mockVenues;
  const events = data.events && data.events.length > 0 ? data.events : mockEvents;

  // Clasificar partidos por jornada (round)
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  const getVenueName = (venueId?: string) => {
    if (!venueId) return "Cancha por definir";
    return venues.find((v) => v.id === venueId)?.name ?? "Cancha por definir";
  };

  const getEventName = (eventId: string) => {
    return events.find((e) => e.id === eventId)?.name ?? "Campeonato";
  };

  const matchStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return <Badge tone="green">Finalizado</Badge>;
      case "scheduled":
        return <Badge tone="blue">Programado</Badge>;
      case "walkover":
        return <Badge tone="red">W.O.</Badge>;
      case "postponed":
        return <Badge tone="amber">Pospuesto</Badge>;
      default:
        return <Badge tone="neutral">Pendiente</Badge>;
    }
  };

  return (
    <PublicShell>
      <div className="space-y-6 pb-20 md:pb-0">
        <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">Fixture</Badge>
            <Badge tone="dark">Rol de Partidos</Badge>
          </div>
          <div className="mt-7">
            <h1 className="text-3xl font-bold sm:text-5xl">Calendario de Partidos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Cronograma completo de las fechas, canchas asignadas y resultados oficiales de cada partido del campeonato.
            </p>
          </div>
        </section>

        {rounds.length > 0 ? (
          rounds.map((round) => {
            const roundMatches = matches.filter((m) => m.round === round);

            return (
              <div key={round} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-field" />
                  <h2 className="text-lg font-bold text-ink uppercase tracking-wide">
                    Jornada / Fecha {round}
                  </h2>
                  <span className="text-xs text-ink/45">({roundMatches.length} partidos)</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {roundMatches.map((match) => {
                    const homeName = getTeamName(teams, match.homeTeamId);
                    const awayName = getTeamName(teams, match.awayTeamId);
                    const homeTeam = teams.find((t) => t.id === match.homeTeamId);
                    const awayTeam = teams.find((t) => t.id === match.awayTeamId);
                    const venueName = getVenueName(match.venueId);

                    return (
                      <Card key={match.id} className="p-4 hover:border-field/30 transition flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 border-b border-ink/5 pb-2">
                            <span className="text-xs font-semibold text-field">
                              {getEventName(match.eventId)}
                            </span>
                            {matchStatusBadge(match.status)}
                          </div>

                          <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            {/* Equipo Local */}
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-3 w-3 shrink-0 rounded-sm"
                                style={{ backgroundColor: homeTeam?.primaryColor ?? "#cbd5e1" }}
                              />
                              <span className="font-bold text-ink truncate text-sm sm:text-base">
                                {homeName}
                              </span>
                            </div>

                            {/* Marcador / VS */}
                            <div className="px-3 py-1.5 rounded-md bg-mist font-black text-ink text-sm sm:text-base">
                              {match.status === "finished" ? (
                                <span>
                                  {match.homeScore} - {match.awayScore}
                                </span>
                              ) : match.status === "walkover" ? (
                                <span className="text-red-600 text-xs">W.O.</span>
                              ) : (
                                <span className="text-ink/40 text-xs uppercase tracking-wider">VS</span>
                              )}
                            </div>

                            {/* Equipo Visitante */}
                            <div className="flex items-center justify-end gap-2 min-w-0">
                              <span className="font-bold text-ink truncate text-sm sm:text-base text-right">
                                {awayName}
                              </span>
                              <span
                                className="h-3 w-3 shrink-0 rounded-sm"
                                style={{ backgroundColor: awayTeam?.primaryColor ?? "#cbd5e1" }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 text-xs text-ink/60 bg-mist/50 p-2.5 rounded border border-ink/5 mt-2">
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-ink/40" />
                            {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Fecha por definir"}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-ink/40" />
                            {venueName}
                          </p>
                          {match.notes && (
                            <p className="mt-1 text-ink/50 border-t border-ink/5 pt-1.5 italic">
                              Obs: {match.notes}
                            </p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <Card className="p-8 text-center text-ink/55">
            <Calendar className="h-12 w-12 mx-auto text-ink/20 mb-3" />
            <p className="font-bold">Sin fixture programado</p>
            <p className="text-sm mt-1">Actualmente no existen partidos programados en el sistema.</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
