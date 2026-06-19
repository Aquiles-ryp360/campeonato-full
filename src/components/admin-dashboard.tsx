"use client";

import { CheckCircle2, CircleDollarSign, Settings2, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { events, matches, registrationCodes, teams } from "@/lib/mock-data";
import {
  eventStatusLabel,
  formatDateTime,
  formatLabel,
  formatMoney,
  getTeamName,
  sportLabel,
  teamStatusLabel
} from "@/lib/utils";
import { Badge, Button, Card, Metric, SectionHeader } from "./ui";

export function AdminDashboard() {
  const availableCodes = registrationCodes.filter((code) => code.status === "available");
  const activeEvents = events.filter((event) => event.status !== "finished");
  const finishedMatches = matches.filter((match) => match.status === "finished");

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Panel administrador"
          title="Control del campeonato"
          description="Crea eventos, revisa pagos, actualiza resultados y deja visible el avance publico."
        />
        <Button href="/admin/eventos" variant="primary">
          <Settings2 className="h-4 w-4" />
          Nuevo evento
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Eventos abiertos" value={`${activeEvents.length}`} icon={Trophy} />
        <Metric label="Equipos registrados" value={`${teams.length}`} icon={UsersRound} tone="blue" />
        <Metric label="Codigos disponibles" value={`${availableCodes.length}`} icon={CircleDollarSign} tone="amber" />
        <Metric label="Resultados publicados" value={`${finishedMatches.length}`} icon={CheckCircle2} tone="green" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-ink/10 p-5">
            <SectionHeader
              title="Inscripciones"
              description="Cada equipo entra con un codigo entregado despues del pago por Yape o Plin."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-mist text-left text-xs uppercase text-ink/55">
                <tr>
                  <th className="px-5 py-3">Equipo</th>
                  <th className="px-3 py-3">Evento</th>
                  <th className="px-3 py-3">Metodo</th>
                  <th className="px-3 py-3">Codigo</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-5 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {teams.map((team) => {
                  const event = events.find((current) => current.id === team.eventId);
                  return (
                    <tr key={team.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{team.name}</p>
                        <p className="text-xs text-ink/55">{team.delegatePhone}</p>
                      </td>
                      <td className="px-3 py-3">{event?.name}</td>
                      <td className="px-3 py-3 uppercase">{team.paymentMethod}</td>
                      <td className="px-3 py-3">{team.registrationCode}</td>
                      <td className="px-3 py-3">
                        <Badge tone={team.paymentStatus === "verified" ? "green" : "amber"}>
                          {teamStatusLabel(team.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          variant="secondary"
                          onClick={() => toast.success(`Codigo de ${team.name} revisado`)}
                        >
                          Revisar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Partidos recientes"
            description="Los resultados pueden cargarse manualmente o desde audio con revision."
          />
          <div className="mt-4 space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="rounded-md border border-ink/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={match.status === "finished" ? "green" : "blue"}>
                    {match.status === "finished" ? "Publicado" : "Pendiente"}
                  </Badge>
                  <span className="text-xs font-semibold text-ink/55">
                    {formatDateTime(match.scheduledAt)}
                  </span>
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

      <Card className="p-5">
        <SectionHeader title="Codigos de inscripcion" description="Lote manual que el encargado entrega despues de cobrar." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {registrationCodes.map((code) => (
            <div key={code.id} className="rounded-md border border-ink/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{code.code}</p>
                  <p className="mt-1 text-sm uppercase text-ink/55">{code.paymentMethod}</p>
                </div>
                <Badge
                  tone={
                    code.status === "available"
                      ? "green"
                      : code.status === "used"
                        ? "amber"
                        : "red"
                  }
                >
                  {code.status === "available"
                    ? "Disponible"
                    : code.status === "used"
                      ? "Usado"
                      : "Anulado"}
                </Badge>
              </div>
              {code.usedByTeamId ? (
                <p className="mt-3 text-sm text-ink/60">
                  Equipo: {teams.find((team) => team.id === code.usedByTeamId)?.name}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Eventos" description="Configuracion principal visible para los equipos al inscribirse." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border border-ink/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{event.name}</p>
                  <p className="mt-1 text-sm text-ink/58">
                    {sportLabel(event.sport)} · {event.category}
                  </p>
                </div>
                <Badge tone={event.status === "registration" ? "green" : "neutral"}>
                  {eventStatusLabel(event.status)}
                </Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-ink/65">
                <p>{formatLabel(event.format)}</p>
                <p>{formatMoney(event.registrationFee)} · max {event.maxTeams} equipos</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
