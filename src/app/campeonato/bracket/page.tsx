import { getPublicCompetitionData } from "@/lib/supabase-data";
import {
  matches as mockMatches,
  teams as mockTeams,
  events as mockEvents
} from "@/lib/mock-data";
import { PublicShell } from "@/components/shell";
import { Card, Badge } from "@/components/ui";
import { Trophy, Network, Eye } from "lucide-react";
import { getTeamName, formatDateTime } from "@/lib/utils";
import type { Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const data = await getPublicCompetitionData();
  const matches = data.matches && data.matches.length > 0 ? data.matches : mockMatches;
  const teams = data.teams && data.teams.length > 0 ? data.teams : mockTeams;
  const events = data.events && data.events.length > 0 ? data.events : mockEvents;

  // Filtrar eventos que tienen formato Eliminación Directa o Grupos + Eliminación
  const playoffEvents = events.filter(
    (e) => e.formatId === "format-knockout" || e.formatId === "format-groups" || e.formatId === "single_elimination" || e.formatId === "groups_then_knockout"
  );

  return (
    <PublicShell>
      <div className="space-y-6 pb-20 md:pb-0">
        <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">Playoffs</Badge>
            <Badge tone="dark">Llaves del Torneo</Badge>
          </div>
          <div className="mt-7">
            <h1 className="text-3xl font-bold sm:text-5xl">Árbol de Eliminación</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Sigue el camino de los equipos clasificados en las llaves finales desde octavos de final hasta consagrarse campeones.
            </p>
          </div>
        </section>

        {playoffEvents.length > 0 ? (
          playoffEvents.map((event) => {
            const eventMatches = matches.filter((m) => m.eventId === event.id && m.stage !== "group_stage");
            const eventTeams = teams.filter((t) => t.eventId === event.id);

            // Filtrar partidos por ronda
            const octavos = eventMatches.filter((m) => m.stage === "round_of_16").sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
            const cuartos = eventMatches.filter((m) => m.stage === "quarter_finals").sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
            const semis = eventMatches.filter((m) => m.stage === "semi_finals").sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
            const final = eventMatches.find((m) => m.stage === "final");
            const thirdPlace = eventMatches.find((m) => m.stage === "third_place");

            // Si no hay partidos de playoffs programados
            if (eventMatches.length === 0) {
              return (
                <div key={event.id} className="space-y-4">
                  <Card className="p-4 border-l-4 border-l-field">
                    <h2 className="text-xl font-bold text-ink">{event.name}</h2>
                    <p className="text-xs text-ink/55 mt-1">
                      Fase de llaves aún no iniciada. Los clasificados aparecerán cuando culmine la fase anterior.
                    </p>
                  </Card>
                </div>
              );
            }

            return (
              <div key={event.id} className="space-y-6">
                <Card className="p-4 border-l-4 border-l-field">
                  <h2 className="text-xl font-bold text-ink">{event.name}</h2>
                  <p className="text-xs text-ink/55 mt-1">
                    Fixture de eliminación directa · Rondas finales
                  </p>
                </Card>

                {/* Contenedor del Bracket */}
                <div className="overflow-x-auto overscroll-x-contain bg-ink text-white p-5 rounded-lg shadow-panel">
                  <div className="w-full min-w-[900px] flex justify-between gap-6 py-4">
                    
                    {/* Columna: Octavos (Si existen) */}
                    {octavos.length > 0 && (
                      <div className="flex-1 flex flex-col justify-around gap-4 min-h-[500px]">
                        <h4 className="text-center text-xs font-black uppercase text-white/50 border-b border-white/10 pb-2 mb-2">Octavos</h4>
                        {octavos.map((match) => (
                          <BracketMatchCard key={match.id} match={match} teams={eventTeams} />
                        ))}
                      </div>
                    )}

                    {/* Columna: Cuartos (Si existen) */}
                    {(cuartos.length > 0 || octavos.length > 0) && (
                      <div className="flex-1 flex flex-col justify-around gap-4 min-h-[500px] py-8">
                        <h4 className="text-center text-xs font-black uppercase text-white/50 border-b border-white/10 pb-2 mb-2">Cuartos</h4>
                        {cuartos.length > 0 ? (
                          cuartos.map((match) => (
                            <BracketMatchCard key={match.id} match={match} teams={eventTeams} />
                          ))
                        ) : (
                          <div className="text-center text-xs text-white/20">Por definir</div>
                        )}
                      </div>
                    )}

                    {/* Columna: Semifinales */}
                    <div className="flex-1 flex flex-col justify-around gap-4 min-h-[500px] py-16">
                      <h4 className="text-center text-xs font-black uppercase text-white/50 border-b border-white/10 pb-2 mb-2">Semifinal</h4>
                      {semis.length > 0 ? (
                        semis.map((match) => (
                          <BracketMatchCard key={match.id} match={match} teams={eventTeams} />
                        ))
                      ) : (
                        <div className="text-center text-xs text-white/20">Por definir</div>
                      )}
                    </div>

                    {/* Columna: Finales */}
                    <div className="flex-1 flex flex-col justify-center items-center gap-8 min-h-[500px] px-2 bg-white/5 rounded border border-white/10 py-6">
                      
                      <div className="text-center">
                        <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">Gran Final</h4>
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-300 text-ink shadow-[0_4px_15px_rgba(252,211,77,0.3)] ring-4 ring-white/10 my-3 mx-auto">
                          <Trophy className="h-8 w-8 text-ink" />
                        </div>
                        {final ? (
                          <BracketMatchCard match={final} teams={eventTeams} isFinal />
                        ) : (
                          <div className="text-xs text-white/30">Cruce por definir</div>
                        )}
                      </div>

                      {thirdPlace && (
                        <div className="text-center border-t border-white/10 pt-4 w-full">
                          <h4 className="text-xs font-black uppercase text-sky-300 tracking-wider">Tercer Puesto</h4>
                          <div className="my-2">
                            <BracketMatchCard match={thirdPlace} teams={eventTeams} />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Card className="p-8 text-center text-ink/55">
            <Network className="h-12 w-12 mx-auto text-ink/20 mb-3" />
            <p className="font-bold">Sin llaves de playoffs</p>
            <p className="text-sm mt-1">Actualmente no existen campeonatos con llaves de eliminación activa.</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}

function BracketMatchCard({ match, teams, isFinal = false }: { match: Match; teams: Team[]; isFinal?: boolean }) {
  const homeName = getTeamName(teams, match.homeTeamId);
  const awayName = getTeamName(teams, match.awayTeamId);
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const isFinished = match.status === "finished";

  return (
    <div className={`w-full max-w-[240px] text-ink rounded-md p-3 border shadow-sm transition bg-white ${
      isFinal ? "border-amber-300 ring-2 ring-amber-300/30" : "border-ink/10"
    }`}>
      <div className="flex justify-between items-center text-[10px] font-bold text-field uppercase tracking-wide border-b border-ink/5 pb-1 mb-2">
        <span>Llave {match.bracketPosition ?? 1}</span>
        {isFinished ? <span className="text-green-700">Fin</span> : <span className="text-ink/40">Prog</span>}
      </div>

      <div className="space-y-1">
        {/* Fila Home */}
        <div className={`flex items-center justify-between p-1 rounded text-xs ${
          isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "bg-green-50 font-bold" : "text-ink/80"
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: homeTeam?.primaryColor ?? "#cbd5e1" }} />
            <span className="truncate">{homeName}</span>
          </div>
          {isFinished && <span className="bg-ink/10 px-1.5 py-0.5 rounded font-bold">{match.homeScore}</span>}
        </div>

        {/* Fila Away */}
        <div className={`flex items-center justify-between p-1 rounded text-xs ${
          isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "bg-green-50 font-bold" : "text-ink/80"
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: awayTeam?.primaryColor ?? "#cbd5e1" }} />
            <span className="truncate">{awayName}</span>
          </div>
          {isFinished && <span className="bg-ink/10 px-1.5 py-0.5 rounded font-bold">{match.awayScore}</span>}
        </div>
      </div>

      <p className="text-[10px] text-ink/45 mt-2 truncate">
        {match.scheduledAt ? formatDateTime(match.scheduledAt) : "Por programar"}
      </p>
    </div>
  );
}
