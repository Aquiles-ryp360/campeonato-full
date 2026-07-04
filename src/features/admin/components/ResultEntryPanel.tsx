"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, History, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import type { ResultAuditLog } from "@/lib/queries/admin-results";
import type { Match, MatchLiveEvent, Player, Team } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  SectionHeader,
  Tabs,
  inputClass,
  type DataTableColumn
} from "@/components/ui";
import { getTeamName, formatDateTime } from "@/lib/utils";
import { formatMatchScore, liveStatusLabel } from "@/lib/live-match";

type ResultTab = "all" | "pending" | "review" | "corrected";

export function ResultEntryPanel({
  data,
  auditLogs = []
}: {
  data: CompetitionData;
  auditLogs?: ResultAuditLog[];
}) {
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [tab, setTab] = useState<ResultTab>("pending");
  const filteredMatches = useMemo(() => filterMatches(data.matches, tab), [data.matches, tab]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Admin"
        title="Resultados y correcciones"
        description="Revisa resultados enviados, corrige marcadores y anula/restaura eventos con auditoria."
        action={<Badge tone="blue">{filteredMatches.length} partidos</Badge>}
      />

      <Tabs
        items={[
          { label: "Pendientes", active: tab === "pending", onClick: () => setTab("pending") },
          { label: "En revision", active: tab === "review", onClick: () => setTab("review") },
          { label: "Corregidos", active: tab === "corrected", onClick: () => setTab("corrected") },
          { label: "Todos", active: tab === "all", onClick: () => setTab("all") }
        ]}
      />

      {filteredMatches.length > 0 ? (
        <div className="grid gap-4">
          {filteredMatches.map((match) => (
            <ResultMatchCard
              key={match.id}
              match={match}
              data={data}
              auditLogs={auditLogs}
              busy={busyMatchId === match.id}
              onBusyChange={setBusyMatchId}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin resultados en este filtro"
          description="Cuando un arbitro envie un resultado o el admin marque revision, aparecera aqui."
        />
      )}

      <AuditTrail auditLogs={auditLogs} />
    </div>
  );
}

function ResultMatchCard({
  match,
  data,
  auditLogs,
  busy,
  onBusyChange
}: {
  match: Match;
  data: CompetitionData;
  auditLogs: ResultAuditLog[];
  busy: boolean;
  onBusyChange: (matchId: string | null) => void;
}) {
  const router = useRouter();
  const events = (data.matchLiveEvents ?? []).filter((event) => event.matchId === match.id);
  const reviewableEvents = events.filter(isReviewableEvent);
  const matchAuditLogs = auditLogsForMatch(auditLogs, match, events);

  async function postAdminAction(payload: Record<string, unknown>, successMessage: string) {
    onBusyChange(match.id);
    try {
      const response = await fetch(`/api/admin/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar el resultado.");
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el resultado.");
    } finally {
      onBusyChange(null);
    }
  }

  async function markUnderReview() {
    const reason = window.prompt("Motivo de revision")?.trim();
    if (!reason) return;
    await postAdminAction({ action: "mark_under_review", reason }, "Resultado marcado en revision.");
  }

  async function correctResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = window.prompt("Motivo de correccion")?.trim();
    if (!reason) return;

    await postAdminAction(
      {
        action: "correct_result",
        homeScore: form.get("homeScore"),
        awayScore: form.get("awayScore"),
        penaltyHomeScore: form.get("penaltyHomeScore") || undefined,
        penaltyAwayScore: form.get("penaltyAwayScore") || undefined,
        reason
      },
      "Resultado corregido y auditado."
    );
  }

  async function changeEventCorrection(event: MatchLiveEvent) {
    const restore = Boolean(event.correctedAt);
    const reason = window.prompt(restore ? "Motivo para restaurar el evento" : "Motivo para anular el evento")?.trim();
    if (!reason) return;

    await postAdminAction(
      {
        action: restore ? "restore_event" : "void_event",
        eventId: event.id,
        reason
      },
      restore ? "Evento restaurado y auditado." : "Evento anulado y auditado."
    );
  }

  const columns: Array<DataTableColumn<MatchLiveEvent>> = [
    {
      key: "type",
      header: "Evento",
      cell: (event) => (
        <div>
          <p className="font-black text-ink">{eventLabel(event.eventType)}</p>
          <p className="mt-1 text-xs font-semibold text-brand-muted">{event.period} - min {event.minute}</p>
        </div>
      )
    },
    {
      key: "person",
      header: "Equipo / jugador",
      cell: (event) => (
        <div>
          <p className="font-semibold text-ink">{teamLabel(data.teams, event.teamId)}</p>
          <p className="mt-1 text-xs font-semibold text-brand-muted">{playerLabel(data.players, event.playerId, event.jerseyNumber)}</p>
        </div>
      )
    },
    {
      key: "score",
      header: "Marcador",
      cell: (event) => (
        <span className="font-black tabular-nums text-ink">
          {event.scoreHome ?? "-"} - {event.scoreAway ?? "-"}
          {event.penaltyOrder ? ` / penal #${event.penaltyOrder}` : ""}
        </span>
      )
    },
    {
      key: "status",
      header: "Estado",
      cell: (event) => (
        <div className="space-y-1">
          <Badge tone={event.correctedAt ? "red" : "green"}>{event.correctedAt ? "Anulado" : "Activo"}</Badge>
          {event.correctionReason ? <p className="max-w-xs text-xs text-brand-muted">{event.correctionReason}</p> : null}
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (event) => (
        <Button
          type="button"
          variant={event.correctedAt ? "secondary" : "danger"}
          disabled={busy}
          onClick={() => void changeEventCorrection(event)}
        >
          {event.correctedAt ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          {event.correctedAt ? "Restaurar" : "Anular"}
        </Button>
      )
    }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-brand-towerMid/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(match)}>{liveStatusLabel(match.liveStatus, match.status)}</Badge>
              <Badge tone="neutral">{formatDateTime(match.scheduledAt)}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-black text-ink">
              {getTeamName(data.teams, match.homeTeamId)} vs {getTeamName(data.teams, match.awayTeamId)}
            </h2>
            <p className="mt-1 text-sm font-semibold text-brand-muted">
              {match.court} - {formatMatchScore(match)}
            </p>
          </div>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void markUnderReview()}>
            <AlertTriangle className="h-4 w-4" />
            Revision
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <form
          onSubmit={(event) => void correctResult(event)}
          className="grid gap-3 rounded-md border border-brand-towerMid/25 bg-brand-wash/40 p-4 md:grid-cols-[1fr_90px_90px_90px_90px_auto] md:items-end"
        >
          <div>
            <p className="font-black text-ink">Corregir resultado</p>
            <p className="mt-1 text-sm text-brand-muted">La correccion recalcula ganador, llaves y auditoria.</p>
          </div>
          <Field label="Local">
            <input name="homeScore" className={inputClass} type="number" min={0} defaultValue={match.homeScore ?? 0} />
          </Field>
          <Field label="Visita">
            <input name="awayScore" className={inputClass} type="number" min={0} defaultValue={match.awayScore ?? 0} />
          </Field>
          <Field label="Pen. L">
            <input name="penaltyHomeScore" className={inputClass} type="number" min={0} defaultValue={match.penaltyHomeScore ?? 0} />
          </Field>
          <Field label="Pen. V">
            <input name="penaltyAwayScore" className={inputClass} type="number" min={0} defaultValue={match.penaltyAwayScore ?? 0} />
          </Field>
          <Button type="submit" disabled={busy}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </form>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-black text-ink">Goles, tarjetas, penales y eventos anulados</p>
            <Badge tone="neutral">{reviewableEvents.length} eventos</Badge>
          </div>
          <DataTable
            rows={reviewableEvents}
            columns={columns}
            getRowKey={(event) => event.id}
            empty={<EmptyState title="Sin eventos registrados" description="Cuando el arbitro registre goles, tarjetas o penales apareceran aqui." />}
          />
        </div>

        <MatchAuditTrail auditLogs={matchAuditLogs} />
      </div>
    </Card>
  );
}

function MatchAuditTrail({ auditLogs }: { auditLogs: ResultAuditLog[] }) {
  if (auditLogs.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-brand-electric" />
        <p className="font-black text-ink">Auditoria del partido</p>
      </div>
      <AuditTable auditLogs={auditLogs.slice(0, 5)} />
    </div>
  );
}

function AuditTrail({ auditLogs }: { auditLogs: ResultAuditLog[] }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Auditoria reciente" description="Ultimas correcciones criticas registradas en audit_logs." />
      <div className="mt-4">
        <AuditTable auditLogs={auditLogs} />
      </div>
    </Card>
  );
}

function AuditTable({ auditLogs }: { auditLogs: ResultAuditLog[] }) {
  const columns: Array<DataTableColumn<ResultAuditLog>> = [
    {
      key: "created",
      header: "Fecha",
      cell: (log) => <span className="text-xs font-semibold text-brand-muted">{formatDateTime(log.createdAt)}</span>
    },
    {
      key: "action",
      header: "Accion",
      cell: (log) => <span className="font-black text-ink">{auditActionLabel(log.action)}</span>
    },
    {
      key: "entity",
      header: "Entidad",
      cell: (log) => <span className="text-xs font-semibold text-brand-muted">{log.entityTable}</span>
    },
    {
      key: "reason",
      header: "Motivo",
      cell: (log) => <span className="text-sm text-brand-muted">{auditReason(log)}</span>
    }
  ];

  return (
    <DataTable
      rows={auditLogs}
      columns={columns}
      getRowKey={(log) => log.id}
      empty={<EmptyState title="Sin auditoria registrada" description="Las correcciones criticas quedaran registradas aqui." />}
    />
  );
}

function filterMatches(matches: Match[], tab: ResultTab) {
  if (tab === "all") return matches;
  if (tab === "pending") {
    return matches.filter((match) => ["referee_submitted", "submitted", "under_review", "disputed"].includes(match.liveStatus ?? ""));
  }
  if (tab === "review") {
    return matches.filter((match) => match.liveStatus === "under_review" || match.liveStatus === "disputed");
  }
  return matches.filter((match) => match.liveStatus === "corrected" || match.liveStatus === "validated");
}

function isReviewableEvent(event: MatchLiveEvent) {
  return [
    "goal",
    "own_goal",
    "penalty_goal",
    "penalty_missed",
    "yellow_card",
    "red_card",
    "penalty_scored",
    "penalty_missed_tiebreak",
    "observation"
  ].includes(event.eventType);
}

function eventLabel(eventType: MatchLiveEvent["eventType"]) {
  const labels: Record<MatchLiveEvent["eventType"], string> = {
    match_started: "Inicio",
    first_half_finished: "Fin primer tiempo",
    second_half_started: "Inicio segundo tiempo",
    match_finished: "Fin del partido",
    result_submitted: "Resultado enviado",
    penalties_started: "Inicio penales",
    penalties_finished: "Fin penales",
    bracket_updated: "Llave actualizada",
    goal: "Gol",
    own_goal: "Autogol",
    penalty_goal: "Gol de penal",
    penalty_missed: "Penal fallado",
    yellow_card: "Tarjeta amarilla",
    red_card: "Tarjeta roja",
    foul: "Falta",
    injury: "Lesion",
    observation: "Observacion",
    penalty_scored: "Penal anotado",
    penalty_missed_tiebreak: "Penal fallado"
  };

  return labels[eventType];
}

function statusTone(match: Match): "neutral" | "green" | "amber" | "red" | "blue" | "dark" {
  const status = match.liveStatus ?? "scheduled";
  if (status === "under_review" || status === "disputed") return "amber";
  if (status === "corrected" || status === "validated" || status === "referee_submitted" || status === "submitted") return "green";
  if (status === "cancelled") return "red";
  if (status === "scheduled") return "blue";
  return "dark";
}

function teamLabel(teams: Team[], teamId?: string) {
  if (!teamId) return "Sin equipo";
  return teams.find((team) => team.id === teamId)?.name ?? "Equipo no encontrado";
}

function playerLabel(players: Player[], playerId?: string, jerseyNumber?: number) {
  const player = players.find((item) => item.id === playerId);
  if (!player) return jerseyNumber ? `Camiseta ${jerseyNumber}` : "Sin jugador";
  const number = player.jerseyNumber ? `#${player.jerseyNumber} ` : "";
  return `${number}${player.firstName} ${player.lastName}`.trim();
}

function auditLogsForMatch(auditLogs: ResultAuditLog[], match: Match, events: MatchLiveEvent[]) {
  const eventIds = new Set(events.map((event) => event.id));
  return auditLogs.filter((log) => {
    const payloadMatchId = typeof log.payload.matchId === "string" ? log.payload.matchId : null;
    return payloadMatchId === match.id || log.entityId === match.id || Boolean(log.entityId && eventIds.has(log.entityId));
  });
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "admin.result.mark_under_review": "Resultado en revision",
    "admin.result.correct": "Resultado corregido",
    "admin.event.void": "Evento anulado",
    "admin.event.restore": "Evento restaurado"
  };

  return labels[action] ?? action;
}

function auditReason(log: ResultAuditLog) {
  const reason = log.payload.reason;
  if (typeof reason === "string") return reason;
  return "Sin motivo visible";
}
