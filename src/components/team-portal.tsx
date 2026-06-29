"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { fetchBrowserCompetitionData } from "@/lib/browser-competition-data";
import type { CompetitionData } from "@/lib/data-mappers";
import { getStoredSession } from "@/lib/auth";
import { formatDateTime, getTeamName, playerRoleLabel, teamStatusLabel } from "@/lib/utils";
import { Badge, Card, Metric, SectionHeader } from "./ui";

export function TeamPortal({ initialData }: { initialData: CompetitionData }) {
  const [data, setData] = useState(initialData);
  const [delegateEmail, setDelegateEmail] = useState<string | null>(null);
  const { teams, players, matches } = data;
  const team = useMemo(() => {
    const normalizedEmail = delegateEmail?.toLowerCase();
    if (!normalizedEmail) return null;
    return teams.find((current) => current.delegateEmail.toLowerCase() === normalizedEmail) ?? null;
  }, [delegateEmail, teams]);

  useEffect(() => {
    setDelegateEmail(getStoredSession()?.username.toLowerCase() ?? null);

    fetchBrowserCompetitionData({ includeRegistrationCodes: true })
      .then(setData)
      .catch(() => {
        toast.error("No se pudieron cargar los datos actualizados del delegado.");
      });
  }, []);

  if (!team) {
    return (
      <div id="resumen" className="scroll-mt-24">
        <Card className="p-6">
          <SectionHeader
            eyebrow="Panel delegado"
            title="Aun no tienes equipo vinculado"
            description="Cuando tu inscripcion quede registrada en Supabase con este correo, veras aqui tu plantilla, codigo y partidos."
          />
        </Card>
      </div>
    );
  }

  const teamPlayers = players.filter((player) => player.teamId === team.id);
  const teamMatches = matches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id
  );

  return (
    <div id="resumen" className="space-y-6 pb-20 scroll-mt-24 md:pb-0">
      <section id="mi-equipo" className="scroll-mt-24">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{teamStatusLabel(team.status)}</Badge>
              <Badge tone={team.paymentStatus === "verified" ? "green" : "amber"}>
                Codigo {team.paymentStatus === "verified" ? "validado" : "en revision"}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-ink">{team.name}</h1>
            <p className="mt-1 text-sm text-ink/60">
              Delegado: {team.delegateName} · {team.delegatePhone}
            </p>
          </div>
          <div className="flex gap-2">
            <span
              className="h-10 w-10 rounded-md border border-ink/10"
              style={{ backgroundColor: team.primaryColor }}
            />
            <span
              className="h-10 w-10 rounded-md border border-ink/10"
              style={{ backgroundColor: team.secondaryColor }}
            />
          </div>
        </div>
      </Card>
      </section>

      <section id="inscripcion" className="grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Jugadores" value={`${teamPlayers.length}`} icon={UsersRound} />
        <Metric label="Partidos" value={`${teamMatches.length}`} icon={CalendarDays} tone="blue" />
        <Metric label="Codigo" value={team.registrationCode} icon={CreditCard} tone="amber" />
        <Metric label="Estado" value={teamStatusLabel(team.status)} icon={ShieldCheck} tone="green" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div id="jugadores" className="scroll-mt-24">
        <Card className="overflow-hidden">
          <div className="border-b border-ink/10 p-5">
            <SectionHeader
              title="Plantilla"
              description="Datos requeridos por jugador para validar participacion."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-mist text-left text-xs uppercase text-ink/55">
                <tr>
                  <th className="px-5 py-3">Jugador</th>
                  <th className="px-3 py-3">DNI</th>
                  <th className="px-3 py-3">Codigo</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">Ficha</th>
                  <th className="px-5 py-3">Ciclo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {teamPlayers.length > 0 ? teamPlayers.map((player) => (
                  <tr key={player.id}>
                    <td className="px-5 py-3 font-semibold">
                      {player.firstName} {player.lastName}
                    </td>
                    <td className="px-3 py-3">{player.dni}</td>
                    <td className="px-3 py-3">{player.studentCode}</td>
                    <td className="px-3 py-3">{playerRoleLabel(player.lineupRole)}</td>
                    <td className="px-3 py-3">{player.enrollmentFile}</td>
                    <td className="px-5 py-3">{player.semester}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink/55">
                      Todavia no hay jugadores registrados para este equipo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        </div>

        <div id="mis-partidos" className="scroll-mt-24">
        <Card className="p-5">
          <div id="resultados" className="scroll-mt-24">
            <SectionHeader title="Partidos del equipo" description="El jugador puede estar en dos deportes; la asistencia queda bajo responsabilidad del equipo." />
          </div>
          <div className="mt-4 space-y-3">
            {teamMatches.length > 0 ? teamMatches.map((match) => (
              <div key={match.id} className="rounded-md border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <Badge tone={match.status === "finished" ? "green" : "blue"}>
                    Jornada {match.round}
                  </Badge>
                  <span className="text-xs font-semibold text-ink/55">{formatDateTime(match.scheduledAt)}</span>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-semibold">
                  <span>{getTeamName(teams, match.homeTeamId)}</span>
                  <span className="rounded-md bg-mist px-2 py-1">
                    {match.status === "finished" ? `${match.homeScore} - ${match.awayScore}` : "vs"}
                  </span>
                  <span className="text-right">{getTeamName(teams, match.awayTeamId)}</span>
                </div>
              </div>
            )) : (
              <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55">
                Todavia no hay partidos programados para tu equipo.
              </div>
            )}
          </div>
        </Card>
        </div>
      </section>

      <section id="comunicados" className="scroll-mt-24">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-sky/10 text-sky-900">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <SectionHeader
                title="Comunicados"
                description="Avisos oficiales sobre horarios, bases, cambios y decisiones del campeonato."
              />
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
