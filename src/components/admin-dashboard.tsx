"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Mail,
  Settings2,
  Trophy,
  UsersRound
} from "lucide-react";
import { toast } from "sonner";
import { fetchBrowserCompetitionData } from "@/lib/browser-competition-data";
import type { CompetitionData } from "@/lib/data-mappers";
import type { PaymentMethod, Player, TeamStatus } from "@/lib/types";
import { FootballDrawPanel } from "./football-draw-panel";
import {
  eventStatusLabel,
  formatDateTime,
  formatLabel,
  formatMoney,
  getTeamName,
  playerRoleLabel,
  sportLabel,
  teamStatusLabel
} from "@/lib/utils";
import { Badge, Button, Card, Metric, SectionHeader } from "./ui";

type DelegateAdminRow = {
  id: string;
  source: "base" | "local";
  teamName: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  eventName: string;
  eventDescription: string;
  paymentMethod: PaymentMethod;
  registrationCode: string;
  teamStatus: TeamStatus | "local";
  statusLabel: string;
  playerCount: number;
  starterCount: number;
  substituteCount: number;
  registeredAt?: string;
  access: {
    username: string;
    passwordLabel: string;
  };
};

const delegatePanelUrl = "https://campeonato-full.vercel.app/delegado";

export function AdminDashboard({ initialData }: { initialData: CompetitionData }) {
  const [data, setData] = useState(initialData);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { events, matches, registrationCodes, teams } = data;
  const availableCodes = registrationCodes.filter((code) => code.status === "available");
  const activeEvents = events.filter((event) => event.status !== "finished");
  const finishedMatches = matches.filter((match) => match.status === "finished");
  const delegateRows = useMemo(() => createDelegateRows(data), [data]);

  useEffect(() => {
    fetchBrowserCompetitionData({ includeRegistrationCodes: true })
      .then((nextData) => {
        setData(nextData);
      })
      .catch(() => {
        toast.error("No se pudieron cargar todos los datos administrativos desde Supabase.");
      })
      .finally(() => setIsLoadingData(false));
  }, []);

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

      <FootballDrawPanel data={data} onDataChange={setData} />

      <Card className="overflow-hidden">
        <div className="border-b border-ink/10 p-5">
          <SectionHeader
            title="Delegados y accesos"
            description="Lista administrativa de delegados, equipos, contacto, credenciales y cantidad de jugadores."
            action={
              <Badge tone={isLoadingData ? "amber" : "blue"}>
                {isLoadingData ? "Cargando Supabase" : `${delegateRows.length} delegados`}
              </Badge>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-mist text-left text-xs uppercase text-ink/55">
              <tr>
                <th className="px-5 py-3">Delegado</th>
                <th className="px-3 py-3">Equipo</th>
                <th className="px-3 py-3">Campeonato</th>
                <th className="px-3 py-3">Plantilla</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3">Acceso</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {delegateRows.length > 0 ? delegateRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-ink">{row.delegateName}</p>
                    <p className="mt-1 text-xs text-ink/60">{row.delegatePhone}</p>
                    <p className="text-xs text-ink/60">{row.delegateEmail}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-col items-start gap-2">
                      <p className="font-semibold text-ink">{row.teamName}</p>
                      <Badge
                        tone={
                          row.source === "local"
                            ? "blue"
                            : row.teamStatus === "approved"
                              ? "green"
                              : "amber"
                        }
                      >
                        {row.statusLabel}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-ink">{row.eventName}</p>
                    <p className="mt-1 text-xs text-ink/55">{row.eventDescription}</p>
                    {row.registeredAt ? (
                      <p className="mt-1 text-xs text-ink/55">
                        Alta: {formatDateTime(row.registeredAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-semibold text-ink">{row.playerCount} jugadores</p>
                    <p className="mt-1 text-xs text-ink/60">
                      {row.starterCount} {playerRoleLabel("starter").toLowerCase()} ·{" "}
                      {row.substituteCount} {playerRoleLabel("substitute").toLowerCase()}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-semibold uppercase text-ink">{row.paymentMethod}</p>
                    <p className="mt-1 text-xs text-ink/60">{row.registrationCode}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-mono text-xs font-semibold text-ink">
                      {row.access.username}
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink/65">
                      {row.access.passwordLabel}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="min-h-9 px-3"
                        onClick={() => void copyDelegateAccess(row)}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                      <Button
                        href={createDelegateAccessEmailHref(row)}
                        variant="secondary"
                        className="min-h-9 px-3"
                      >
                        <Mail className="h-4 w-4" />
                        Correo
                      </Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink/55">
                    Todavia no hay delegados registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
                {teams.length > 0 ? teams.map((team) => {
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
                }) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink/55">
                      Todavia no hay equipos inscritos.
                    </td>
                  </tr>
                )}
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
            {matches.length > 0 ? matches.map((match) => (
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
            )) : (
              <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55">
                Todavia no hay partidos registrados en Supabase.
              </div>
            )}
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <SectionHeader title="Codigos de inscripcion" description="Lote manual que el encargado entrega despues de cobrar." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {registrationCodes.length > 0 ? registrationCodes.map((code) => (
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
          )) : (
            <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55 md:col-span-3">
              Todavia no hay codigos cargados o tu sesion admin no pudo leerlos.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Eventos" description="Configuracion principal visible para los equipos al inscribirse." />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {events.length > 0 ? events.map((event) => (
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
          )) : (
            <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55 md:col-span-3">
              Todavia no hay eventos configurados.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function createDelegateRows(data: CompetitionData): DelegateAdminRow[] {
  const { events, players, teams } = data;

  const baseRows: DelegateAdminRow[] = teams.map((team) => {
    const event = events.find((current) => current.id === team.eventId);
    const teamPlayers = players.filter((player) => player.teamId === team.id);

    return {
      id: team.id,
      source: "base",
      teamName: team.name,
      delegateName: team.delegateName,
      delegatePhone: team.delegatePhone,
      delegateEmail: team.delegateEmail,
      eventName: event?.name ?? "Evento sin asignar",
      eventDescription: event ? `${sportLabel(event.sport)} · ${event.category}` : "Sin evento",
      paymentMethod: team.paymentMethod,
      registrationCode: team.registrationCode,
      teamStatus: team.status,
      statusLabel: teamStatusLabel(team.status),
      playerCount: teamPlayers.length,
      starterCount: countPlayersByRole(teamPlayers, "starter"),
      substituteCount: countPlayersByRole(teamPlayers, "substitute"),
      registeredAt: team.createdAt,
      access: {
        username: team.delegateEmail,
        passwordLabel: "Enviada por correo"
      }
    };
  });

  return baseRows;
}

function countPlayersByRole(
  teamPlayers: Player[],
  role: "starter" | "substitute"
) {
  return teamPlayers.filter((player) => player.lineupRole === role).length;
}

async function copyDelegateAccess(row: DelegateAdminRow) {
  const accessText = createDelegateAccessText(row);

  if (!navigator.clipboard) {
    toast.info("Copia manualmente el usuario y contrasena del delegado.");
    return;
  }

  try {
    await navigator.clipboard.writeText(accessText);
    toast.success(`Acceso de ${row.teamName} copiado.`);
  } catch {
    toast.error("No se pudo copiar el acceso automaticamente.");
  }
}

function createDelegateAccessText(row: DelegateAdminRow) {
  return [
    `Equipo: ${row.teamName}`,
    `Delegado: ${row.delegateName}`,
    `Usuario: ${row.access.username}`,
    `Contrasena: ${row.access.passwordLabel}`,
    `Panel: ${delegatePanelUrl}`
  ].join("\n");
}

function createDelegateAccessEmailHref(row: DelegateAdminRow) {
  const subject = `Acceso delegado - ${row.teamName}`;
  const body = [
    `Hola ${row.delegateName},`,
    "",
    "Estos son tus accesos al panel de delegado del campeonato interno de Mecanica Electrica organizado por octavo semestre:",
    "",
    `Equipo: ${row.teamName}`,
    `Usuario: ${row.access.username}`,
    `Contrasena: ${row.access.passwordLabel}`,
    `Panel: ${delegatePanelUrl}`,
    "",
    "Guarda estos datos para revisar tu plantilla, horarios y observaciones."
  ].join("\n");

  return `mailto:${encodeURIComponent(row.delegateEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
