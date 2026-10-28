"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Dices, Expand, Printer, RotateCcw, Save, Shuffle, Tag } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import {
  defaultGroupCount,
  groupConflicts,
  groupSizes,
  pickGroup,
  suggestTeamTag,
  supportsGroupKnockout,
  type DrawTags
} from "@/lib/domain/group-draw";
import { Badge, Button, Card, ConfirmDialog, Field, SectionHeader, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  approved: "Aprobado",
  registered: "Inscrito",
  observed: "Observado",
  pending_payment: "Pago pendiente",
  rejected: "Rechazado"
};

export function GroupDrawPanel({ data }: { data: CompetitionData }) {
  const groupEvents = data.events.filter((event) => event.format === "groups_then_knockout");
  const [eventId, setEventId] = useState(groupEvents[0]?.id ?? "");
  if (groupEvents.length === 0) return null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Sorteo de grupos en vivo"
        description="Etiqueta a cada equipo con su semestre para que no caigan juntos, gira la ruleta frente a los delegados y confirma los grupos para crear el fixture."
      />
      <div className="mt-5 max-w-md">
        <Field label="Campeonato">
          <select className={inputClass} value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {groupEvents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {/* key: al cambiar de campeonato se reinicia todo el estado del sorteo. */}
      <EventDraw key={eventId} data={data} eventId={eventId} />
    </Card>
  );
}

function EventDraw({ data, eventId }: { data: CompetitionData; eventId: string }) {
  const router = useRouter();
  const event = data.events.find((item) => item.id === eventId);
  const [teamScope, setTeamScope] = useState<"approved" | "active">("active");
  const scopeStatuses = teamScope === "approved" ? ["approved"] : ["registered", "observed", "approved"];
  const eventTeams = data.teams.filter((team) => team.eventId === eventId);
  const drawTeams = eventTeams.filter((team) => scopeStatuses.includes(team.status));
  const teamName = new Map(eventTeams.map((team) => [team.id, team.name]));

  const savedTags = event?.scheduleConfig?.drawTags ?? {};
  const [tags, setTags] = useState<DrawTags>(() =>
    Object.fromEntries(
      eventTeams.map((team) => [
        team.id,
        savedTags[team.id] ??
          suggestTeamTag(data.players.filter((player) => player.teamId === team.id).map((player) => player.semester))
      ])
    )
  );
  const [savingTags, setSavingTags] = useState(false);

  const recommendedGroupCount = defaultGroupCount(drawTeams.length);
  const [groupCountInput, setGroupCountInput] = useState<number | null>(null);
  const groupCount = groupCountInput ?? recommendedGroupCount;
  const sizes = drawTeams.length >= groupCount * 2 ? groupSizes(drawTeams.length, groupCount) : [];

  // Grupos ya guardados: se muestran para poder ajustarlos sin volver a girar.
  const existingGroups = data.groups
    .filter((group) => group.eventId === eventId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => data.groupTeams.filter((item) => item.groupId === group.id).map((item) => item.teamId));
  const existingMatches =
    existingGroups.flat().length === drawTeams.length && drawTeams.every((team) => existingGroups.flat().includes(team.id));
  const [board, setBoard] = useState<string[][] | null>(existingMatches ? existingGroups : null);
  const [boardSizes, setBoardSizes] = useState<number[]>(existingGroups.map((group) => group.length));
  const pending = board ? drawTeams.map((team) => team.id).filter((id) => !board.flat().includes(id)) : [];

  const [spinName, setSpinName] = useState<string>();
  const [landed, setLanded] = useState<{ teamId: string; group: number }>();
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const locked = event?.fixtureStatus === "published" || event?.fixtureStatus === "locked";
  const conflicts = board ? groupConflicts(board, tags) : [];
  const conflictIds = new Set(conflicts.flatMap((conflict) => conflict.teamIds));
  const canStart = sizes.length > 0 && supportsGroupKnockout(groupCount) && !locked;
  const boardComplete =
    Boolean(board) && pending.length === 0 && board!.flat().length === drawTeams.length && board!.every((group) => group.length >= 2);

  function startBoard() {
    setBoard(sizes.map(() => []));
    setBoardSizes(sizes);
    setLanded(undefined);
    setSelected(undefined);
  }

  function place(teamId: string, current: string[][]) {
    const group = pickGroup(current, boardSizes, teamId, tags);
    const next = current.map((teams, index) => (index === group ? [...teams, teamId] : teams));
    return { next, group };
  }

  function spin() {
    if (!board || pending.length === 0 || spinning) return;
    setSpinning(true);
    setLanded(undefined);
    const winner = pending[Math.floor(Math.random() * pending.length)];
    const steps = 22;
    let step = 0;
    const tick = () => {
      step += 1;
      if (step < steps) {
        setSpinName(teamName.get(pending[Math.floor(Math.random() * pending.length)]));
        setTimeout(tick, 45 + step * step * 0.9); // se frena como una ruleta
        return;
      }
      // El tablero no cambia mientras gira (botones bloqueados), asi que board sigue vigente.
      const { next, group } = place(winner, board!);
      setSpinName(teamName.get(winner));
      setBoard(next);
      setLanded({ teamId: winner, group });
      setSpinning(false);
    };
    tick();
  }

  function drawRest() {
    if (!board) return;
    let next = board;
    for (const id of [...pending].sort(() => Math.random() - 0.5)) next = place(id, next).next;
    setBoard(next);
    setLanded(undefined);
  }

  // Click en un equipo y luego en otro de otro grupo: se intercambian (los tamanos no cambian).
  function selectTeam(teamId: string) {
    if (!board || spinning) return;
    if (!selected || selected === teamId) {
      setSelected(selected === teamId ? undefined : teamId);
      return;
    }
    setBoard(board.map((group) => group.map((id) => (id === selected ? teamId : id === teamId ? selected : id))));
    setSelected(undefined);
  }

  async function saveTags() {
    setSavingTags(true);
    try {
      const response = await fetch("/api/admin/group-draw", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, tags })
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudieron guardar las etiquetas.");
        return;
      }
      toast.success("Etiquetas guardadas.");
      router.refresh();
    } catch {
      toast.error("No se pudieron guardar las etiquetas.");
    } finally {
      setSavingTags(false);
    }
  }

  async function confirmGroups() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/group-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, teamScope, groups: board })
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; matchCount?: number } | null;
      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudieron guardar los grupos.");
        return;
      }
      toast.success(`Grupos guardados: ${payload?.matchCount ?? 0} partidos programados.`);
      router.refresh();
    } catch {
      toast.error("No se pudieron guardar los grupos.");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-5 space-y-6">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-brand-navy">
              Inscritos: {eventTeams.length} equipos · entran al sorteo {drawTeams.length}
            </p>
            <p className="text-xs font-semibold text-brand-muted">
              La etiqueta se sugiere con el semestre de los jugadores; corrigela si hace falta. Mismo texto = mismo semestre.
            </p>
          </div>
          <Button variant="secondary" disabled={savingTags} onClick={() => void saveTags()}>
            <Save className="h-4 w-4" />
            Guardar etiquetas
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr>
                <th className="py-2 pr-3">Equipo</th>
                <th className="py-2 pr-3">Delegado</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2">Semestre (etiqueta)</th>
              </tr>
            </thead>
            <tbody>
              {eventTeams.map((team) => (
                <tr key={team.id} className="border-t border-brand-towerMid/20">
                  <td className="py-2 pr-3 font-bold text-ink">{team.name}</td>
                  <td className="py-2 pr-3 text-brand-muted">{team.delegateName}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={team.status === "approved" ? "green" : team.status === "rejected" ? "red" : "amber"}>
                      {statusLabel[team.status] ?? team.status}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <input
                      aria-label={`Semestre de ${team.name}`}
                      className={cn(inputClass, "max-w-28")}
                      value={tags[team.id] ?? ""}
                      onChange={(e) => setTags({ ...tags, [team.id]: e.target.value.trim() })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Equipos que entran">
          <select
            className={inputClass}
            value={teamScope}
            onChange={(e) => setTeamScope(e.target.value as "approved" | "active")}
          >
            <option value="active">Aprobados, inscritos y observados</option>
            <option value="approved">Solo aprobados</option>
          </select>
        </Field>
        <Field label="Numero de grupos">
          <select
            className={inputClass}
            value={groupCount}
            onChange={(e) => setGroupCountInput(Number(e.target.value))}
          >
            {[2, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} grupos{count === recommendedGroupCount ? " (recomendado)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-bold text-ink">Reparto</span>
          <p className="min-h-10 rounded-md bg-brand-electric/5 px-3 py-2 text-sm font-semibold text-brand-navy">
            {drawTeams.length} equipos{sizes.length ? ` · ${sizes.join("-")}` : " · faltan equipos"}
          </p>
        </div>
      </section>

      {locked ? (
        <p className="text-sm font-semibold text-red-800">El fixture ya esta publicado o bloqueado; no se puede volver a sortear.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canStart || spinning} onClick={startBoard}>
          <RotateCcw className="h-4 w-4" />
          {board ? "Reiniciar sorteo" : "Iniciar sorteo en vivo"}
        </Button>
        <Button variant="secondary" href={`/imprimir/grupos?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          Imprimir tablas por grupo
        </Button>
        <Button variant="secondary" href={`/imprimir/fichas?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          Imprimir fichas
        </Button>
        <Button variant="secondary" href={`/imprimir/actas?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          Imprimir actas
        </Button>
      </div>

      {board ? (
        <div ref={stageRef} className="space-y-4 overflow-auto rounded-lg bg-white p-4 ring-1 ring-brand-towerMid/25">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-black text-brand-navy">{event?.name}</p>
            <Button variant="ghost" onClick={() => void stageRef.current?.requestFullscreen?.()}>
              <Expand className="h-4 w-4" />
              Proyectar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div
              aria-live="polite"
              className={cn(
                "grid min-h-24 place-items-center rounded-lg border-4 px-4 text-center text-2xl font-black sm:text-4xl",
                spinning ? "border-brand-yellow bg-brand-yellow/20 text-brand-navy" : "border-brand-electric/30 bg-brand-electric/5 text-brand-navy"
              )}
            >
              {spinName ?? (pending.length ? "Listo para girar" : "Sorteo completo")}
              {landed && !spinning ? (
                <span className="mt-1 block text-base font-bold text-brand-electric sm:text-xl">
                  → Grupo {"ABCDEFGH"[landed.group]}
                  {tags[landed.teamId] ? ` · semestre ${tags[landed.teamId]}` : ""}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 md:flex-col">
              <Button variant="highlight" className="min-h-14 text-base" disabled={spinning || pending.length === 0} onClick={spin}>
                <Dices className="h-5 w-5" />
                Girar ruleta ({pending.length})
              </Button>
              <Button variant="secondary" disabled={spinning || pending.length === 0} onClick={drawRest}>
                <Shuffle className="h-4 w-4" />
                Sortear el resto
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {board.map((group, index) => (
              <div key={index} className="rounded-md border border-brand-towerMid/25 p-3">
                <p className="text-sm font-black text-brand-navy">
                  Grupo {"ABCDEFGH"[index]} <span className="text-brand-muted">({group.length}/{boardSizes[index]})</span>
                </p>
                <ol className="mt-2 space-y-1">
                  {group.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => selectTeam(id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm font-bold transition",
                          landed?.teamId === id && "bg-brand-yellow/40",
                          conflictIds.has(id) && "bg-coral/10 text-red-800",
                          selected === id ? "ring-2 ring-brand-electric" : "hover:bg-brand-electric/10"
                        )}
                      >
                        <span>{teamName.get(id) ?? id}</span>
                        {tags[id] ? (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
                            <Tag className="h-3 w-3" />
                            {tags[id]}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, boardSizes[index] - group.length) }, (_, slot) => (
                    <li key={`empty-${slot}`} className="rounded border border-dashed border-brand-towerMid/40 px-2 py-1 text-sm text-brand-muted">
                      —
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {conflicts.length > 0 ? (
            <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {conflicts.length} cruce(s) del mismo semestre:{" "}
              {conflicts.map((conflict) => `Grupo ${"ABCDEFGH"[conflict.groupIndex]} (sem. ${conflict.tag})`).join(", ")}. Haz clic en
              un equipo y luego en otro para intercambiarlos.
            </p>
          ) : (
            <p className="text-sm font-semibold text-brand-muted">
              Sin cruces del mismo semestre. Para corregir a mano: clic en un equipo y luego en otro de otro grupo.
            </p>
          )}

          <Button disabled={!boardComplete || saving || locked} onClick={() => setConfirming(true)}>
            <Save className="h-4 w-4" />
            Confirmar grupos y crear fixture
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Confirmar grupos"
        description="Se reemplazan los grupos y partidos de este campeonato (no los equipos ni sus jugadores) y se crea el fixture con horarios y la llave final."
        confirmLabel="Confirmar"
        destructive={existingGroups.length > 0}
        busy={saving}
        onConfirm={() => void confirmGroups()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
