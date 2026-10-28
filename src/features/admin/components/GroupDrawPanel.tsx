"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Dices, Printer, Save, Tag, X } from "lucide-react";
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

  // El sorteo siempre arranca vacio y se hace en vivo; los grupos guardados solo se reemplazan al confirmar.
  const hasSavedGroups = data.groups.some((group) => group.eventId === eventId);
  const [board, setBoard] = useState<string[][] | null>(null);
  const [boardSizes, setBoardSizes] = useState<number[]>([]);
  const pending = board ? drawTeams.map((team) => team.id).filter((id) => !board.flat().includes(id)) : [];

  const [landed, setLanded] = useState<{ teamId: string; group: number }>();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!wheelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !spinning && setWheelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wheelOpen, spinning]);

  const locked = event?.fixtureStatus === "published" || event?.fixtureStatus === "locked";
  const conflicts = board ? groupConflicts(board, tags) : [];
  const conflictIds = new Set(conflicts.flatMap((conflict) => conflict.teamIds));
  const canStart = sizes.length > 0 && supportsGroupKnockout(groupCount) && !locked;
  const boardComplete =
    Boolean(board) && pending.length === 0 && board!.flat().length === drawTeams.length && board!.every((group) => group.length >= 2);

  function startBoard() {
    setConfirmed(false);
    setBoard(sizes.map(() => []));
    setBoardSizes(sizes);
    setLanded(undefined);
    setSelected(undefined);
    setRotation(0);
    setWheelOpen(true);
  }

  function place(teamId: string, current: string[][]) {
    const group = pickGroup(current, boardSizes, teamId, tags);
    const next = current.map((teams, index) => (index === group ? [...teams, teamId] : teams));
    return { next, group };
  }

  // Gira la ruleta hasta dejar al ganador bajo la flecha; al detenerse el equipo va solo a su grupo.
  function spin() {
    if (!board || pending.length === 0 || spinning) return;
    const winnerIndex = Math.floor(Math.random() * pending.length);
    const winner = pending[winnerIndex];
    const slice = 360 / pending.length;
    const target = -((winnerIndex + 0.5) * slice) + (Math.random() - 0.5) * slice * 0.6;
    const delta = (((target - rotation) % 360) + 360) % 360;
    setSpinning(true);
    setLanded(undefined);
    setRotation(rotation + 360 * 6 + delta);
    setTimeout(() => {
      // El tablero no cambia mientras gira (botones bloqueados), asi que board sigue vigente.
      const { next, group } = place(winner, board);
      setBoard(next);
      setLanded({ teamId: winner, group });
      setSpinning(false);
    }, SPIN_MS + 150);
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
      setConfirmed(true);
      setBoard(null);
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
      ) : hasSavedGroups && !board ? (
        <p className="text-sm font-semibold text-brand-muted">
          Este campeonato ya tiene grupos guardados. Haz el sorteo nuevo con la ruleta; los grupos anteriores solo se reemplazan al confirmar.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="highlight" className="min-h-12 text-base" disabled={!canStart || spinning} onClick={startBoard}>
          <Dices className="h-4 w-4" />
          Nuevo sorteo con ruleta
        </Button>
        <Button variant="secondary" href={`/imprimir/grupos?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          PDF de grupos, tablas y llave
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

      {confirmed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-600/10 p-4 ring-1 ring-green-600/20">
          <p className="text-sm font-black text-green-800">Sorteo guardado. Descarga la hoja para jugarlo en fisico.</p>
          <Button variant="highlight" href={`/imprimir/grupos?evento=${eventId}&pdf=1`}>
            <Printer className="h-4 w-4" />
            Descargar PDF (grupos, tablas y llave)
          </Button>
        </div>
      ) : null}

      {board ? (
        <div className="space-y-4 rounded-lg bg-white p-4 ring-1 ring-brand-towerMid/25">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-black text-brand-navy">
              {event?.name} · {pending.length ? `faltan ${pending.length} equipos` : "sorteo completo"}
            </p>
            <Button variant="highlight" onClick={() => setWheelOpen(true)}>
              <Dices className="h-4 w-4" />
              Abrir ruleta
            </Button>
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

      {wheelOpen && board ? (
        <div role="dialog" aria-modal="true" aria-label="Ruleta del sorteo" className="fixed inset-0 z-50 overflow-auto bg-brand-navy p-4 text-white sm:p-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="text-xl font-black sm:text-2xl">Sorteo · {event?.name}</p>
            <Button variant="secondary" disabled={spinning} onClick={() => setWheelOpen(false)}>
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>
          <div className="mx-auto mt-4 grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div className="flex flex-col items-center gap-4">
              {pending.length > 0 ? (
                <Wheel names={pending.map((id) => teamName.get(id) ?? id)} rotation={rotation} />
              ) : (
                <p className="py-20 text-3xl font-black">Sorteo completo</p>
              )}
              <p aria-live="polite" className="min-h-16 text-center text-2xl font-black sm:text-3xl">
                {landed && !spinning ? (
                  <>
                    {teamName.get(landed.teamId)}{" "}
                    <span className="text-brand-yellow">→ Grupo {"ABCDEFGH"[landed.group]}</span>
                  </>
                ) : spinning ? (
                  "Girando..."
                ) : null}
              </p>
              <Button variant="highlight" className="min-h-14 px-8 text-lg" disabled={spinning || pending.length === 0} onClick={spin}>
                <Dices className="h-5 w-5" />
                Girar ({pending.length})
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {board.map((group, index) => (
                <div key={index} className="rounded-md bg-white p-3 text-ink">
                  <p className="text-lg font-black text-brand-navy">Grupo {"ABCDEFGH"[index]}</p>
                  <ol className="mt-1 space-y-1">
                    {Array.from({ length: boardSizes[index] }, (_, slot) => {
                      const id = group[slot];
                      return (
                        <li
                          key={slot}
                          className={cn(
                            "rounded px-2 py-1 font-bold",
                            id ? "bg-brand-electric/10" : "border border-dashed border-brand-towerMid/40 text-brand-muted",
                            id && landed?.teamId === id && "bg-brand-yellow"
                          )}
                        >
                          {id ? teamName.get(id) : "—"}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Confirmar grupos"
        description="Se reemplazan los grupos y partidos de este campeonato (no los equipos ni sus jugadores) y se crea el fixture con horarios y la llave final."
        confirmLabel="Confirmar"
        destructive={hasSavedGroups}
        busy={saving}
        onConfirm={() => void confirmGroups()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

const SPIN_MS = 4500;
const wheelColors = ["#1d4ed8", "#f59e0b", "#0f766e", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#db2777"];

// Ruleta SVG: una porcion por equipo pendiente; la flecha de arriba marca al ganador.
function Wheel({ names, rotation }: { names: string[]; rotation: number }) {
  const slice = 360 / names.length;
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.sin(rad) * 100).toFixed(3)} ${(-Math.cos(rad) * 100).toFixed(3)}`;
  };
  const fontSize = names.length > 12 ? 6 : names.length > 8 ? 7.5 : 9;

  return (
    <div className="relative w-full max-w-[min(80vw,520px)]">
      <svg viewBox="-110 -118 220 228" className="w-full" aria-hidden="true">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
          }}
        >
          {names.length === 1 ? (
            <circle r="100" fill={wheelColors[0]} />
          ) : (
            names.map((_, index) => (
              <path
                key={index}
                d={`M0 0 L${point(index * slice)} A100 100 0 ${slice > 180 ? 1 : 0} 1 ${point((index + 1) * slice)} Z`}
                fill={wheelColors[index % wheelColors.length]}
                stroke="#fff"
                strokeWidth="0.8"
              />
            ))
          )}
          {names.map((name, index) => (
            <text
              key={index}
              transform={`rotate(${(index + 0.5) * slice - 90}) translate(58 0)`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={fontSize}
              fontWeight="800"
            >
              {name.length > 18 ? `${name.slice(0, 17)}…` : name}
            </text>
          ))}
        </g>
        <circle r="10" fill="#fff" stroke="#0f172a" strokeWidth="2" />
        <path d="M-9 -116 L9 -116 L0 -96 Z" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
