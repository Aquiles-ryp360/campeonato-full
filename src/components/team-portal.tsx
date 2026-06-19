"use client";

import { CalendarDays, CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import { matches, players, teams } from "@/lib/mock-data";
import { formatDateTime, getTeamName, playerRoleLabel, teamStatusLabel } from "@/lib/utils";
import { Badge, Card, Metric, SectionHeader } from "./ui";

export function TeamPortal() {
  const team = teams[0];
  const teamPlayers = players.filter((player) => player.teamId === team.id);
  const teamMatches = matches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Jugadores" value={`${teamPlayers.length}`} icon={UsersRound} />
        <Metric label="Partidos" value={`${teamMatches.length}`} icon={CalendarDays} tone="blue" />
        <Metric label="Codigo" value={team.registrationCode} icon={CreditCard} tone="amber" />
        <Metric label="Estado" value={teamStatusLabel(team.status)} icon={ShieldCheck} tone="green" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
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
                {teamPlayers.map((player) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Partidos del equipo" description="El jugador puede estar en dos deportes; la asistencia queda bajo responsabilidad del equipo." />
          <div className="mt-4 space-y-3">
            {teamMatches.map((match) => (
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
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
