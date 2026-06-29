"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { hasSupabaseEnv } from "@/lib/supabase";
import type { Player, Team, TeamStatus, TournamentEvent } from "@/lib/types";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { teamStatusLabel } from "@/lib/utils";

type TeamAction = "approve" | "observe" | "delete";

type DuplicateRosterAlert = {
  kind: "DNI" | "Codigo";
  value: string;
  playerName: string;
  teamNames: string[];
};

type TeamReview = {
  event: TournamentEvent | null;
  players: Player[];
  playerCount: number;
  issues: string[];
  duplicateAlerts: DuplicateRosterAlert[];
};

export function TeamsReviewTable({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const [teams, setTeams] = useState(data.teams);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const reviewByTeamId = useMemo(
    () => buildTeamReviews({ events: data.events, teams, players: data.players }),
    [data.events, data.players, teams]
  );
  const duplicateAlerts = useMemo(
    () => buildDuplicateRosterAlerts(teams, data.players),
    [data.players, teams]
  );

  useEffect(() => {
    setTeams(data.teams);
  }, [data.teams]);

  async function handleTeamAction(team: Team, action: TeamAction) {
    const review = reviewByTeamId.get(team.id);

    if (action === "approve" && review?.issues.length) {
      toast.error(review.issues[0]);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`Eliminar la inscripcion de ${team.name}? Esta accion borra tambien su plantel.`);
      if (!confirmed) return;
    }

    if (!hasSupabaseEnv()) {
      applyLocalAction(team, action);
      toast.info("Modo preview: accion aplicada solo en esta vista.");
      return;
    }

    const actionId = `${team.id}:${action}`;
    setBusyAction(actionId);

    try {
      const response = await fetch("/api/admin/team-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teamId: team.id,
          action
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; status?: TeamStatus; deleted?: boolean }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload && !payload.ok ? payload.error : "No se pudo revisar el equipo.");
        return;
      }

      applyLocalAction(team, action, payload.status);
      toast.success(actionSuccessMessage(action));
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor para revisar el equipo.");
    } finally {
      setBusyAction(null);
    }
  }

  function applyLocalAction(team: Team, action: TeamAction, status?: TeamStatus) {
    if (action === "delete") {
      setTeams((current) => current.filter((item) => item.id !== team.id));
      return;
    }

    const nextStatus = status ?? (action === "approve" ? "approved" : "observed");
    setTeams((current) => current.map((item) => (item.id === team.id ? { ...item, status: nextStatus } : item)));
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Inscripciones"
          description="Aprueba, observa o elimina equipos segun jugadores requeridos y duplicados."
          action={<Badge tone={duplicateAlerts.length > 0 ? "red" : "blue"}>{teams.length} equipos</Badge>}
        />
        {duplicateAlerts.length > 0 ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Alerta: hay jugadores registrados en mas de un equipo.</p>
                <div className="mt-2 space-y-1">
                  {duplicateAlerts.slice(0, 5).map((alert) => (
                    <p key={`${alert.kind}:${alert.value}:${alert.teamNames.join("|")}`}>
                      {alert.playerName} aparece con {alert.kind} {alert.value} en {alert.teamNames.join(" y ")}.
                    </p>
                  ))}
                  {duplicateAlerts.length > 5 ? (
                    <p className="font-semibold">Y {duplicateAlerts.length - 5} alerta(s) mas.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-mist text-left text-xs uppercase text-ink/55">
            <tr>
              <th className="px-5 py-3">Equipo</th>
              <th className="px-3 py-3">Campeonato</th>
              <th className="px-3 py-3">Delegado</th>
              <th className="px-3 py-3">Pago</th>
              <th className="px-3 py-3">Revision</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {teams.map((team) => {
              const review = reviewByTeamId.get(team.id) ?? emptyReview;
              const approveActionId = `${team.id}:approve`;
              const observeActionId = `${team.id}:observe`;
              const deleteActionId = `${team.id}:delete`;
              const canApprove = review.issues.length === 0 && team.status !== "approved";
              const hasIssues = review.issues.length > 0;

              return (
                <tr key={team.id} className={hasIssues ? "bg-red-50/40" : undefined}>
                  <td className="px-5 py-4 align-top">
                    <p className="font-bold text-ink">{team.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={teamStatusTone(team.status, hasIssues)}>
                        {teamStatusLabel(team.status)}
                      </Badge>
                      {hasIssues ? <Badge tone="red">Revisar</Badge> : <Badge tone="green">Cumple</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-semibold text-ink">{review.event?.name ?? "Sin campeonato"}</p>
                    <p className="mt-1 text-xs text-ink/55">{review.event?.category}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-semibold text-ink">{team.delegateName}</p>
                    <p className="text-xs text-ink/60">{team.delegateEmail}</p>
                    <p className="text-xs text-ink/60">{team.delegatePhone}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-bold uppercase text-ink">{team.paymentMethod}</p>
                    <p className="text-xs text-ink/55">{team.registrationCode}</p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-semibold text-ink">
                      {review.playerCount} jugador(es)
                      {review.event ? ` / requerido ${review.event.minPlayers}-${review.event.maxPlayers}` : ""}
                    </p>
                    {review.issues.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-red-800">
                        {review.issues.map((issue) => (
                          <p key={issue}>{issue}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-field">Plantel apto para aprobar.</p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={!canApprove || busyAction !== null}
                        onClick={() => void handleTeamAction(team, "approve")}
                      >
                        {busyAction === approveActionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Aprobar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={team.status === "observed" || busyAction !== null}
                        onClick={() => void handleTeamAction(team, "observe")}
                      >
                        {busyAction === observeActionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        Observar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busyAction !== null}
                        onClick={() => void handleTeamAction(team, "delete")}
                      >
                        {busyAction === deleteActionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Eliminar
                      </Button>
                      <Button href={`mailto:${team.delegateEmail}`} variant="secondary">
                        <Mail className="h-4 w-4" />
                        Escribir
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink/55">
                  Todavia no hay inscripciones.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const emptyReview: TeamReview = {
  event: null,
  players: [],
  playerCount: 0,
  issues: [],
  duplicateAlerts: []
};

function buildTeamReviews({
  events,
  teams,
  players
}: {
  events: TournamentEvent[];
  teams: Team[];
  players: Player[];
}) {
  const duplicateAlertsByTeamId = buildDuplicateAlertsByTeamId(teams, players);
  const reviews = new Map<string, TeamReview>();

  for (const team of teams) {
    const event = events.find((item) => item.id === team.eventId) ?? null;
    const teamPlayers = players.filter((player) => player.teamId === team.id);
    const duplicateAlerts = duplicateAlertsByTeamId.get(team.id) ?? [];
    const issues: string[] = [];

    if (!event) {
      issues.push("No se encontro el campeonato del equipo.");
    } else {
      if (teamPlayers.length < event.minPlayers) {
        issues.push(`Faltan ${event.minPlayers - teamPlayers.length} jugador(es) para el minimo.`);
      }
      if (teamPlayers.length > event.maxPlayers) {
        issues.push(`Excede el maximo por ${teamPlayers.length - event.maxPlayers} jugador(es).`);
      }
    }

    if (duplicateAlerts.length > 0) {
      issues.push("Hay jugador(es) repetidos en otro equipo del mismo campeonato.");
    }

    reviews.set(team.id, {
      event,
      players: teamPlayers,
      playerCount: teamPlayers.length,
      issues,
      duplicateAlerts
    });
  }

  return reviews;
}

function buildDuplicateRosterAlerts(teams: Team[], players: Player[]) {
  return Array.from(buildDuplicateAlertsByTeamId(teams, players).values()).flat();
}

function buildDuplicateAlertsByTeamId(teams: Team[], players: Player[]) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const teamIdsByEventId = new Map<string, Set<string>>();
  const alertsByTeamId = new Map<string, DuplicateRosterAlert[]>();

  for (const team of teams) {
    const teamIds = teamIdsByEventId.get(team.eventId) ?? new Set<string>();
    teamIds.add(team.id);
    teamIdsByEventId.set(team.eventId, teamIds);
  }

  for (const teamIds of teamIdsByEventId.values()) {
    const buckets = new Map<string, { kind: "DNI" | "Codigo"; value: string; players: Player[] }>();

    for (const player of players.filter((item) => teamIds.has(item.teamId))) {
      for (const key of duplicateKeys(player)) {
        const bucket = buckets.get(key.key) ?? { kind: key.kind, value: key.value, players: [] };
        bucket.players.push(player);
        buckets.set(key.key, bucket);
      }
    }

    for (const bucket of buckets.values()) {
      const affectedTeamIds = Array.from(new Set(bucket.players.map((player) => player.teamId)));
      if (affectedTeamIds.length < 2) continue;

      const teamNames = affectedTeamIds.map((teamId) => teamsById.get(teamId)?.name ?? "Equipo");
      for (const player of bucket.players) {
        const currentAlerts = alertsByTeamId.get(player.teamId) ?? [];
        currentAlerts.push({
          kind: bucket.kind,
          value: bucket.value,
          playerName: `${player.firstName} ${player.lastName}`.trim() || "Jugador",
          teamNames
        });
        alertsByTeamId.set(player.teamId, currentAlerts);
      }
    }
  }

  return alertsByTeamId;
}

function duplicateKeys(player: Player) {
  return [
    { kind: "DNI" as const, value: player.dni, key: `dni:${normalizeKey(player.dni)}` },
    { kind: "Codigo" as const, value: player.studentCode, key: `code:${normalizeKey(player.studentCode)}` }
  ].filter((item) => !item.key.endsWith(":"));
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function teamStatusTone(status: TeamStatus, hasIssues: boolean) {
  if (hasIssues) return "red";
  if (status === "approved") return "green";
  if (status === "observed") return "amber";
  if (status === "registered") return "blue";
  return "neutral";
}

function actionSuccessMessage(action: TeamAction) {
  if (action === "approve") return "Equipo aprobado.";
  if (action === "observe") return "Equipo marcado como observado.";

  return "Equipo eliminado.";
}
