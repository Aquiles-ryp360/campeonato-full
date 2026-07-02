"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  Flag,
  RotateCcw,
  ShieldAlert,
  Square,
  Timer,
  Trophy,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card } from "@/components/ui";
import {
  canFinalizePenaltyShootout,
  formatMatchScore,
  penaltyAttemptTone,
  summarizePenaltyShootout
} from "@/lib/live-match";
import type { RefereeLiveMatchData } from "@/lib/queries/referee";
import type { MatchLiveEventType, Player, Team } from "@/lib/types";
import { formatDateTime, getMatchSideLabel } from "@/lib/utils";

type PendingPlayerPick = {
  team: Team;
  players: Player[];
  eventType: MatchLiveEventType;
  title: string;
};

export function RefereeLiveMatch({ data }: { data: RefereeLiveMatchData }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [picker, setPicker] = useState<PendingPlayerPick | null>(null);
  const match = data.match;
  const status = match.liveStatus ?? "scheduled";
  const homeName = getMatchSideLabel(match, teamsForMatch(data), "home");
  const awayName = getMatchSideLabel(match, teamsForMatch(data), "away");
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const penaltySummary = useMemo(
    () => summarizePenaltyShootout(match, data.events),
    [data.events, match]
  );
  const penaltyHomeScore = status === "penalties" ? penaltySummary.homeScore : match.penaltyHomeScore ?? 0;
  const penaltyAwayScore = status === "penalties" ? penaltySummary.awayScore : match.penaltyAwayScore ?? 0;
  const firstHalfMinute = data.event.scheduleConfig?.halfTimeMinute ?? Math.floor((data.event.scheduleConfig?.matchDurationMinutes ?? 90) / 2);
  const secondHalfMinutes = (data.event.scheduleConfig?.matchDurationMinutes ?? firstHalfMinute * 2) - firstHalfMinute;
  const breakMinutes = data.event.scheduleConfig?.halfTimeBreakMinutes ?? 10;
  const timer = useMemo(
    () => buildTimer(match, now, firstHalfMinute),
    [firstHalfMinute, match, now]
  );
  const mainAction = getMainAction(status, homeScore, awayScore, data.event.format, match.stage);
  const eventActionsEnabled = status === "in_progress_first_half" || status === "in_progress_second_half";
  const secondaryActionsEnabled = eventActionsEnabled || status === "halftime";
  const penaltiesEnabled = status === "penalties";
  const thresholdReached =
    (status === "in_progress_first_half" && timer.elapsedMinutes >= firstHalfMinute) ||
    (status === "halftime" && timer.elapsedMinutes >= breakMinutes) ||
    (status === "in_progress_second_half" && timer.elapsedMinutes >= secondHalfMinutes);
  const finishPenaltyDisabled = mainAction?.action === "finish_penalties" && !canFinalizePenaltyShootout(penaltySummary);
  const mainActionDisabled = Boolean(busyAction) || finishPenaltyDisabled;

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    const actionKey = `${action}:${JSON.stringify(payload)}`;
    setBusyAction(actionKey);

    try {
      const response = await fetch(`/api/referee/matches/${match.id}/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo actualizar el partido.");
      }

      toast.success(successMessage(action));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el partido.");
    } finally {
      setBusyAction(null);
    }
  }

  function confirmAndRun(action: string, message: string) {
    if (!window.confirm(message)) return;
    void runAction(action);
  }

  function openPicker(team: Team | undefined, players: Player[], eventType: MatchLiveEventType) {
    if (!team) {
      toast.error("Equipo no disponible para este evento.");
      return;
    }

    setPicker({
      team,
      players,
      eventType,
      title: eventTitle(eventType, team.name)
    });
  }

  function recordWithoutPlayer(team: Team, eventType: MatchLiveEventType, notes?: string) {
    void runAction("record_event", {
      eventType,
      teamId: team.id,
      notes
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24 md:pb-4">
      <div className="sticky top-[65px] z-20 rounded-lg border border-brand-towerMid/25 bg-white p-3 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone={statusBadgeTone(status)}>{statusLabel(status)}</Badge>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-muted">
            <Clock className="h-4 w-4" />
            {formatDateTime(match.scheduledAt)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreTeam name={homeName} align="left" />
          <div className="rounded-md bg-brand-navy px-4 py-3 text-center text-white shadow-lift">
            <p className="text-4xl font-black tabular-nums">
              {homeScore} - {awayScore}
            </p>
            {status === "penalties" || penaltyHomeScore || penaltyAwayScore ? (
              <p className="mt-1 text-xs font-bold text-white/70">
                Penales {penaltyHomeScore} - {penaltyAwayScore}
              </p>
            ) : null}
          </div>
          <ScoreTeam name={awayName} align="right" />
        </div>

        {penaltiesEnabled ? (
          <PenaltyShootoutPanel
            homeName={homeName}
            awayName={awayName}
            summary={penaltySummary}
          />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-brand-wash p-3">
              <p className="text-xs font-black uppercase text-brand-muted">Cronometro</p>
              <p className="text-3xl font-black tabular-nums text-ink">{timer.display}</p>
            </div>
            <div className="rounded-md bg-brand-wash p-3">
              <p className="text-xs font-black uppercase text-brand-muted">Minuto</p>
              <p className="text-3xl font-black tabular-nums text-ink">{timer.minute}</p>
            </div>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-brand-electric">Partido en vivo</p>
            <h1 className="mt-1 text-2xl font-black text-ink">{data.event.name}</h1>
            <p className="mt-1 text-sm font-semibold text-brand-muted">
              {data.event.category} - {match.court}
            </p>
          </div>
          {mainAction ? (
            <Button
              onClick={() => confirmAndRun(mainAction.action, mainAction.confirm)}
              disabled={mainActionDisabled}
              className={`min-h-12 w-full text-base md:w-auto ${thresholdReached ? "ring-4 ring-amber-300" : ""}`}
            >
              <Timer className="h-5 w-5" />
              {finishPenaltyDisabled ? "Falta ganador" : busyAction?.startsWith(mainAction.action) ? "Procesando..." : mainAction.label}
            </Button>
          ) : null}
        </div>
      </Card>

      {status === "scheduled" ? (
        <PreMatchPanel data={data} />
      ) : null}

      {status === "pending_tiebreak" ? (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-yellow/25 text-brand-navy">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-ink">Empate en eliminacion directa</h2>
              <p className="mt-1 text-sm text-brand-muted">Debe definirse ganador por penales.</p>
              <Button className="mt-4 w-full md:w-auto" disabled={Boolean(busyAction)} onClick={() => runAction("start_penalties")}>
                <Flag className="h-4 w-4" />
                {busyAction?.startsWith("start_penalties") ? "Entrando..." : "Ir a penales"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {["referee_submitted", "submitted", "corrected", "under_review", "validated"].includes(status) ? (
        <Card className="p-4">
          <h2 className="text-xl font-black text-ink">Resultado enviado</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Marcador final: {homeName} {formatMatchScore(match)} {awayName}
          </p>
          {match.winnerTeamId ? (
            <p className="mt-2 text-sm font-semibold text-ink">
              Ganador{match.winMethod === "penalties" ? " por penales" : ""}: {winnerName(match.winnerTeamId, data)}
            </p>
          ) : null}
          <p className={`mt-3 text-sm font-semibold ${status === "under_review" ? "text-brand-navy" : "text-green-800"}`}>
            Estado visual: {statusLabel(status)}.
          </p>
        </Card>
      ) : null}

      {eventActionsEnabled || secondaryActionsEnabled || penaltiesEnabled ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TeamActionPanel
              side="home"
              team={data.homeTeam}
              players={data.homePlayers}
              disabled={!eventActionsEnabled}
              secondaryDisabled={!secondaryActionsEnabled}
              penaltiesEnabled={penaltiesEnabled}
              onPick={openPicker}
              onRecord={recordWithoutPlayer}
              onUndo={(team) => runAction("undo_last_event", { teamId: team.id })}
            />
            <TeamActionPanel
              side="away"
              team={data.awayTeam}
              players={data.awayPlayers}
              disabled={!eventActionsEnabled}
              secondaryDisabled={!secondaryActionsEnabled}
              penaltiesEnabled={penaltiesEnabled}
              onPick={openPicker}
              onRecord={recordWithoutPlayer}
              onUndo={(team) => runAction("undo_last_event", { teamId: team.id })}
            />
          </div>

          {penaltiesEnabled ? (
            <Card className="p-4">
              <Button
                variant="secondary"
                className="min-h-12 w-full text-base"
                disabled={Boolean(busyAction)}
                onClick={() => confirmAndRun("undo_last_penalty", "Anular el ultimo penal registrado?")}
              >
                <RotateCcw className="h-5 w-5" />
                Anular ultimo penal
              </Button>
            </Card>
          ) : null}
        </>
      ) : null}

      <SuspensionsPanel data={data} />
      <EventHistory data={data} />

      {picker ? (
        <PlayerPicker
          picker={picker}
          suspendedPlayerIds={new Set(data.suspensions.map((item) => item.playerId))}
          onClose={() => setPicker(null)}
          onSelect={(player) => {
            void runAction("record_event", {
              eventType: picker.eventType,
              teamId: picker.team.id,
              playerId: player?.id
            });
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PreMatchPanel({ data }: { data: RefereeLiveMatchData }) {
  const enabledPlayers = [...data.homePlayers, ...data.awayPlayers].filter(
    (player) => !data.suspensions.some((item) => item.playerId === player.id)
  );

  return (
    <Card className="p-4">
      <h2 className="text-xl font-black text-ink">Antes del partido</h2>
      <div className="mt-3 grid gap-3 text-sm font-semibold text-brand-muted sm:grid-cols-2">
        <Info label="Campeonato" value={data.event.name} />
        <Info label="Categoria" value={data.event.category} />
        <Info label="Cancha" value={data.match.court} />
        <Info label="Horario" value={formatDateTime(data.match.scheduledAt)} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold text-ink">Jugadores habilitados</p>
        <p className="mt-1 text-sm text-brand-muted">{enabledPlayers.length} jugadores disponibles.</p>
      </div>
    </Card>
  );
}

function PenaltyShootoutPanel({
  homeName,
  awayName,
  summary
}: {
  homeName: string;
  awayName: string;
  summary: ReturnType<typeof summarizePenaltyShootout>;
}) {
  const nextTeamName = summary.nextSide === "home" ? homeName : awayName;

  return (
    <div className="mt-3 rounded-md border border-brand-towerMid/25 bg-brand-wash p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase text-brand-muted">Penales</p>
          <p className="text-sm font-black text-ink">Patea: {nextTeamName}</p>
        </div>
        <div className="rounded-md bg-brand-navy px-3 py-2 text-center text-white">
          <p className="text-xs font-bold uppercase text-white/60">Parcial</p>
          <p className="text-2xl font-black tabular-nums">{summary.homeScore} - {summary.awayScore}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <PenaltyShootoutRow
          name={homeName}
          attempts={summary.home}
          count={summary.homeAttempts}
        />
        <PenaltyShootoutRow
          name={awayName}
          attempts={summary.away}
          count={summary.awayAttempts}
        />
      </div>
    </div>
  );
}

function PenaltyShootoutRow({
  name,
  attempts,
  count
}: {
  name: string;
  attempts: ReturnType<typeof summarizePenaltyShootout>["home"];
  count: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(90px,0.55fr)_1fr_auto] items-center gap-2 rounded-md bg-white p-2">
      <p className="truncate text-xs font-black text-ink">{name}</p>
      <div className="flex min-h-10 flex-wrap items-center gap-2">
        {attempts.length > 0 ? (
          attempts.map((attempt) => {
            const tone = penaltyAttemptTone(attempt.scored);
            return (
              <span
                key={attempt.id}
                className={`inline-flex min-h-9 min-w-10 items-center justify-center gap-1 rounded-md px-2 text-xs font-black text-white ${
                  tone === "green" ? "bg-green-600" : "bg-red-600"
                }`}
                title={`Penal ${attempt.order}`}
              >
                {attempt.scored ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>{attempt.jerseyNumber ?? "S/N"}</span>
                <span className="text-[10px] opacity-75">#{attempt.order}</span>
              </span>
            );
          })
        ) : (
          <span className="text-xs font-semibold text-brand-muted">Sin tiros</span>
        )}
      </div>
      <Badge tone="neutral">{count}</Badge>
    </div>
  );
}

function SuspensionsPanel({ data }: { data: RefereeLiveMatchData }) {
  const players = [...data.homePlayers, ...data.awayPlayers];

  return (
    <Card className="p-4">
      <h2 className="text-xl font-black text-ink">Jugadores suspendidos</h2>
      {data.suspensions.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {data.suspensions.map((suspension) => {
            const player = players.find((item) => item.id === suspension.playerId);
            return (
              <div key={suspension.id} className="flex items-center justify-between gap-3 rounded-md bg-brand-wash p-3">
                <div>
                  <p className="font-bold text-ink">
                    {playerNumber(player)} - {playerName(player)}
                  </p>
                  <p className="text-xs font-semibold text-brand-muted">{suspension.reason}</p>
                </div>
                <Badge tone="red">{suspension.matchesRemaining} partido</Badge>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-brand-muted">No hay jugadores suspendidos para este partido.</p>
      )}
    </Card>
  );
}

function TeamActionPanel({
  team,
  players,
  disabled,
  secondaryDisabled,
  penaltiesEnabled,
  onPick,
  onRecord,
  onUndo
}: {
  side: "home" | "away";
  team?: Team;
  players: Player[];
  disabled: boolean;
  secondaryDisabled: boolean;
  penaltiesEnabled: boolean;
  onPick: (team: Team | undefined, players: Player[], eventType: MatchLiveEventType) => void;
  onRecord: (team: Team, eventType: MatchLiveEventType, notes?: string) => void;
  onUndo: (team: Team) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelDisabled = !team;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-ink">{team?.name ?? "Equipo pendiente"}</h2>
        <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: team?.primaryColor ?? "#cbd5e1" }} />
      </div>

      {penaltiesEnabled ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ActionButton
            label="Penal anotado"
            icon={<Check className="h-5 w-5" />}
            disabled={panelDisabled}
            tone="green"
            onClick={() => onPick(team, players, "penalty_scored")}
          />
          <ActionButton
            label="Penal fallado"
            icon={<Ban className="h-5 w-5" />}
            disabled={panelDisabled}
            tone="red"
            onClick={() => onPick(team, players, "penalty_missed_tiebreak")}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionButton
              label="+ Gol"
              icon={<Trophy className="h-5 w-5" />}
              disabled={disabled || panelDisabled}
              onClick={() => onPick(team, players, "goal")}
            />
            <ActionButton
              label="Amarilla"
              icon={<Square className="h-5 w-5" />}
              disabled={disabled || panelDisabled}
              tone="amber"
              onClick={() => onPick(team, players, "yellow_card")}
            />
            <ActionButton
              label="Roja"
              icon={<ShieldAlert className="h-5 w-5" />}
              disabled={disabled || panelDisabled}
              tone="red"
              onClick={() => onPick(team, players, "red_card")}
            />
            <ActionButton
              label="Anular"
              icon={<RotateCcw className="h-5 w-5" />}
              disabled={panelDisabled}
              tone="neutral"
              onClick={() => team && onUndo(team)}
            />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            disabled={secondaryDisabled || panelDisabled}
            className="mt-3 min-h-11 w-full rounded-md border border-brand-towerMid/25 bg-white text-sm font-black text-ink transition hover:border-brand-electric/35 hover:text-brand-electric disabled:opacity-50"
          >
            Mas acciones
          </button>

          {expanded && team ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SmallAction label="Autogol" disabled={secondaryDisabled} onClick={() => onPick(team, players, "own_goal")} />
              <SmallAction label="Gol penal" disabled={secondaryDisabled} onClick={() => onPick(team, players, "penalty_goal")} />
              <SmallAction label="Penal fallado" disabled={secondaryDisabled} onClick={() => onPick(team, players, "penalty_missed")} />
              <SmallAction label="Falta" disabled={secondaryDisabled} onClick={() => onRecord(team, "foul")} />
              <SmallAction label="Lesion" disabled={secondaryDisabled} onClick={() => onRecord(team, "injury")} />
              <SmallAction
                label="Observacion"
                disabled={secondaryDisabled}
                onClick={() => {
                  const notes = window.prompt("Observacion del partido") ?? "";
                  if (notes.trim()) onRecord(team, "observation", notes.trim());
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

function PlayerPicker({
  picker,
  suspendedPlayerIds,
  onClose,
  onSelect
}: {
  picker: PendingPlayerPick;
  suspendedPlayerIds: Set<string>;
  onClose: () => void;
  onSelect: (player?: Player) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-white p-4 shadow-panel sm:rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-brand-electric">{picker.team.name}</p>
            <h2 className="text-xl font-black text-ink">{picker.title}</h2>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {picker.players.map((player) => {
            const suspended = suspendedPlayerIds.has(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onSelect(player)}
                disabled={suspended}
                className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-brand-towerMid/25 bg-white px-3 py-2 text-left font-bold text-ink transition hover:border-brand-electric/35 disabled:bg-brand-wash disabled:text-ink/40"
              >
                <span>{playerNumber(player)} - {playerName(player)}</span>
                {suspended ? <Badge tone="red">Suspendido</Badge> : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="min-h-14 rounded-md bg-brand-navy px-3 py-2 text-sm font-black text-white hover:bg-brand-electric"
          >
            Sin jugador asignado
          </button>
        </div>
      </div>
    </div>
  );
}

function EventHistory({ data }: { data: RefereeLiveMatchData }) {
  const teams = teamsForMatch(data);
  const players = [...data.homePlayers, ...data.awayPlayers];
  const items = [...data.events].reverse().slice(0, 10);

  return (
    <Card className="p-4">
      <h2 className="text-xl font-black text-ink">Historial</h2>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {items.map((event) => {
            const team = teams.find((item) => item.id === event.teamId);
            const player = players.find((item) => item.id === event.playerId);
            return (
              <div key={event.id} className={`rounded-md bg-brand-wash p-3 ${event.correctedAt ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{eventLabel(event.eventType)}</p>
                  <Badge tone={event.correctedAt ? "red" : "neutral"}>
                    {event.penaltyOrder ? `Penal #${event.penaltyOrder}` : `Min ${event.minute}`}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-brand-muted">
                  {team?.name ?? "Sin equipo"} {player ? `- ${playerNumber(player)} ${playerName(player)}` : ""}
                  {!player && event.jerseyNumber ? ` - ${event.jerseyNumber}` : ""}
                </p>
                {event.notes ? <p className="mt-1 text-sm text-brand-muted">{event.notes}</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-brand-muted">Todavia no hay eventos registrados.</p>
      )}
    </Card>
  );
}

function ScoreTeam({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="line-clamp-2 text-sm font-black text-ink sm:text-lg">{name}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
  tone = "dark"
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "dark" | "green" | "amber" | "red" | "neutral";
}) {
  const tones = {
    dark: "bg-brand-navy text-white hover:bg-brand-electric",
    green: "bg-green-600 text-white",
    amber: "bg-brand-yellow text-brand-navy",
    red: "bg-coral/10 text-red-800",
    neutral: "bg-brand-wash text-ink"
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-black disabled:opacity-45 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SmallAction({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 rounded-md bg-brand-wash px-3 py-2 text-sm font-bold text-ink transition hover:bg-brand-electric/10 hover:text-brand-electric disabled:opacity-45"
    >
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-brand-wash p-3">
      <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}

function buildTimer(match: RefereeLiveMatchData["match"], now: number, firstHalfMinute: number) {
  const status = match.liveStatus ?? "scheduled";
  let startedAt: string | undefined;
  let minuteOffset = 0;

  if (status === "in_progress_first_half") {
    startedAt = match.firstHalfStartedAt ?? match.actualStartedAt;
  }

  if (status === "halftime") {
    startedAt = match.halftimeStartedAt ?? match.firstHalfEndedAt;
    minuteOffset = firstHalfMinute;
  }

  if (status === "in_progress_second_half") {
    startedAt = match.secondHalfStartedAt;
    minuteOffset = firstHalfMinute;
  }

  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const display = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return {
    display,
    elapsedMinutes,
    minute: status === "scheduled" ? 0 : Math.max(0, minuteOffset + Math.ceil(elapsedSeconds / 60))
  };
}

function getMainAction(
  status: string,
  homeScore: number,
  awayScore: number,
  format: string,
  stage: string
) {
  if (status === "scheduled") {
    return {
      action: "start_match",
      label: "Iniciar partido",
      confirm: "Iniciar este partido ahora?"
    };
  }

  if (status === "in_progress_first_half") {
    return {
      action: "finish_first_half",
      label: "Finalizar primer tiempo",
      confirm: "Finalizar el primer tiempo?"
    };
  }

  if (status === "halftime") {
    return {
      action: "start_second_half",
      label: "Iniciar segundo tiempo",
      confirm: "Iniciar el segundo tiempo?"
    };
  }

  if (status === "in_progress_second_half") {
    const tiedKnockout =
      homeScore === awayScore &&
      (format === "single_elimination" || (format === "groups_then_knockout" && stage !== "group_stage"));
    return {
      action: "finish_match",
      label: tiedKnockout ? "Finalizar e ir a desempate" : "Finalizar y enviar",
      confirm: "Finalizar el partido y enviar el resultado?"
    };
  }

  if (status === "penalties") {
    return {
      action: "finish_penalties",
      label: "Finalizar penales",
      confirm: "Finalizar penales y enviar el resultado?"
    };
  }

  return null;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Programado",
    in_progress_first_half: "Primer tiempo",
    halftime: "Descanso",
    in_progress_second_half: "Segundo tiempo",
    pending_tiebreak: "Definir desempate",
    penalties: "Penales",
    referee_submitted: "Resultado oficial",
    submitted: "Resultado oficial",
    validated: "Validado",
    under_review: "En revision",
    corrected: "Corregido",
    disputed: "Observado",
    cancelled: "Cancelado"
  };

  return labels[status] ?? "Programado";
}

function statusBadgeTone(status: string): "neutral" | "green" | "amber" | "red" | "blue" | "dark" {
  if (status === "scheduled") return "blue";
  if (status === "under_review" || status === "pending_tiebreak") return "amber";
  if (status === "cancelled" || status === "disputed") return "red";
  if (status === "referee_submitted" || status === "submitted" || status === "corrected" || status === "validated") return "green";
  return "dark";
}

function successMessage(action: string) {
  const labels: Record<string, string> = {
    start_match: "Partido iniciado.",
    finish_first_half: "Primer tiempo finalizado.",
    start_second_half: "Segundo tiempo iniciado.",
    finish_match: "Resultado actualizado.",
    start_penalties: "Modo penales iniciado.",
    finish_penalties: "Resultado por penales enviado.",
    record_event: "Evento registrado.",
    undo_last_event: "Ultimo evento anulado.",
    undo_last_penalty: "Ultimo penal anulado."
  };

  return labels[action] ?? "Partido actualizado.";
}

function eventTitle(eventType: MatchLiveEventType, teamName: string) {
  return `${eventLabel(eventType)} ${teamName}`;
}

function eventLabel(eventType: MatchLiveEventType) {
  const labels: Record<MatchLiveEventType, string> = {
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

function teamsForMatch(data: RefereeLiveMatchData) {
  return [data.homeTeam, data.awayTeam].filter(Boolean) as Team[];
}

function winnerName(teamId: string, data: RefereeLiveMatchData) {
  return teamsForMatch(data).find((team) => team.id === teamId)?.name ?? "Equipo ganador";
}

function playerName(player?: Player) {
  if (!player) return "Jugador no encontrado";
  return `${player.firstName} ${player.lastName}`.trim();
}

function playerNumber(player?: Player) {
  return player?.jerseyNumber ? String(player.jerseyNumber) : "S/N";
}
