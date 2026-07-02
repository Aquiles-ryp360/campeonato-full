"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import type { Team } from "@/lib/types";
import {
  teamApprovalIssueMessage,
  validateTeamApproval
} from "@/lib/domain/registration-rules";
import { Badge, Button, Card, SectionHeader, inputClass } from "@/components/ui";
import { teamStatusLabel } from "@/lib/utils";

type TeamAction = "validate_payment" | "approve" | "observe" | "reject";

type TeamActionResponse = {
  ok?: boolean;
  error?: string;
  issues?: string[];
};

export function TeamsReviewTable({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const [observations, setObservations] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.teams.map((team) => [team.id, team.adminObservation ?? ""]))
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const playersByTeam = useMemo(() => {
    const map = new Map<string, typeof data.players>();
    data.players.forEach((player) => {
      const current = map.get(player.teamId) ?? [];
      current.push(player);
      map.set(player.teamId, current);
    });
    return map;
  }, [data]);

  async function runAction(team: Team, action: TeamAction) {
    const observation = observations[team.id]?.trim() ?? "";
    if ((action === "observe" || action === "reject") && observation.length < 3) {
      toast.error("Escribe una observacion para observar o rechazar.");
      return;
    }

    const pending = `${team.id}:${action}`;
    setPendingKey(pending);
    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          observation
        })
      });
      const payload = (await response.json().catch(() => null)) as TeamActionResponse | null;

      if (!response.ok || payload?.ok === false) {
        const details = payload?.issues?.length ? ` ${payload.issues.join(" ")}` : "";
        toast.error(`${payload?.error ?? "No se pudo actualizar el equipo."}${details}`);
        return;
      }

      toast.success(actionLabel(action));
      router.refresh();
    } catch {
      toast.error("No se pudo actualizar el equipo.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Inscripciones"
          description="Equipos, delegado, pago, codigo y estado de revision en una sola vista."
          action={<Badge tone="blue">{data.teams.length} equipos</Badge>}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-mist text-left text-xs uppercase text-ink/55">
            <tr>
              <th className="px-5 py-3">Equipo</th>
              <th className="px-3 py-3">Campeonato</th>
              <th className="px-3 py-3">Delegado</th>
              <th className="px-3 py-3">Pago</th>
              <th className="px-3 py-3">Jugadores</th>
              <th className="px-3 py-3">Bloqueantes</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {data.teams.map((team) => {
              const event = data.events.find((item) => item.id === team.eventId);
              const players = playersByTeam.get(team.id) ?? [];
              const issues = event
                ? validateTeamApproval({
                    event,
                    team,
                    players,
                    allTeams: data.teams,
                    allPlayers: data.players
                  })
                : [];
              const canApprove = issues.length === 0;
              const observation = observations[team.id] ?? "";

              return (
                <tr key={team.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-bold text-ink">{team.name}</p>
                    <Badge tone={teamStatusTone(team.status)}>{teamStatusLabel(team.status)}</Badge>
                    {team.adminObservation ? (
                      <p className="mt-2 max-w-[220px] text-xs text-ink/60">
                        {team.adminObservation}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-ink">{event?.name ?? "Sin campeonato"}</p>
                    <p className="mt-1 text-xs text-ink/55">{event?.category}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-ink">{team.delegateName}</p>
                    <p className="text-xs text-ink/60">{team.delegateEmail}</p>
                    <p className="text-xs text-ink/60">{team.delegatePhone}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-bold uppercase text-ink">{team.paymentMethod}</p>
                    <p className="text-xs text-ink/55">{team.registrationCode}</p>
                    <div className="mt-2">
                      <Badge tone={team.paymentStatus === "verified" ? "green" : "amber"}>
                        {team.paymentStatus === "verified" ? "Pago validado" : "Pago pendiente"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-bold text-ink">{players.length}</p>
                    <p className="text-xs text-ink/55">
                      Min {event?.minPlayers ?? "-"} / Max {event?.maxPlayers ?? "-"}
                    </p>
                    {players.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {players.slice(0, 3).map((player) => (
                          <div key={player.id} className="flex flex-wrap items-center gap-1.5">
                            <span className="max-w-[150px] truncate text-xs text-ink/65">
                              {player.firstName} {player.lastName}
                            </span>
                            <IdentityBadge player={player} />
                          </div>
                        ))}
                        {players.length > 3 ? (
                          <p className="text-xs text-ink/55">+{players.length - 3} mas</p>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-4">
                    {issues.length > 0 ? (
                      <div className="space-y-1">
                        {issues.slice(0, 3).map((issue) => (
                          <p key={issue} className="max-w-[260px] text-xs text-red-800">
                            {teamApprovalIssueMessage(issue)}
                          </p>
                        ))}
                        {issues.length > 3 ? (
                          <p className="text-xs text-ink/55">+{issues.length - 3} mas</p>
                        ) : null}
                      </div>
                    ) : (
                      <Badge tone="green">Listo para aprobar</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[290px] flex-col gap-2">
                      <textarea
                        className={`${inputClass} min-h-16`}
                        value={observation}
                        onChange={(changeEvent) =>
                          setObservations((current) => ({
                            ...current,
                            [team.id]: changeEvent.target.value
                          }))
                        }
                        placeholder="Observacion admin"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          disabled={
                            team.paymentStatus === "verified" ||
                            pendingKey === `${team.id}:validate_payment`
                          }
                          onClick={() => void runAction(team, "validate_payment")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Validar pago
                        </Button>
                        <Button
                          disabled={!canApprove || pendingKey === `${team.id}:approve`}
                          onClick={() => void runAction(team, "approve")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={pendingKey === `${team.id}:observe`}
                          onClick={() => void runAction(team, "observe")}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Observar
                        </Button>
                        <Button
                          variant="danger"
                          disabled={pendingKey === `${team.id}:reject`}
                          onClick={() => void runAction(team, "reject")}
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </Button>
                        <Button href={`mailto:${team.delegateEmail}`} variant="ghost">
                          <Mail className="h-4 w-4" />
                          Escribir
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.teams.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink/55">
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

function teamStatusTone(status: Team["status"]) {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "observed") return "amber";
  return "blue";
}

function actionLabel(action: TeamAction) {
  const labels: Record<TeamAction, string> = {
    validate_payment: "Pago validado.",
    approve: "Equipo aprobado.",
    observe: "Equipo observado.",
    reject: "Equipo rechazado."
  };
  return labels[action];
}

function IdentityBadge({ player }: { player: CompetitionData["players"][number] }) {
  if (player.verificationStatus === "manual_review") {
    return <Badge tone="amber">Pendiente de revisión</Badge>;
  }

  if (player.identitySource === "unap_tramites") {
    return <Badge tone="green">Autollenado UNA</Badge>;
  }

  if (player.identitySource === "dni_provider") {
    return <Badge tone="blue">Autollenado DNI</Badge>;
  }

  if (player.identitySource === "peruapi") {
    return <Badge tone="blue">DNI nacional</Badge>;
  }

  if (player.identitySource === "unap_docentes") {
    return <Badge tone="green">Docente UNA</Badge>;
  }

  return <Badge tone="neutral">Manual</Badge>;
}
