"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Printer, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import {
  applyMoves,
  byPlayOrder,
  internalViolations,
  isStartedMatch,
  reorderMoves
} from "@/lib/domain/cross-event-clashes";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { cn, getMatchSideLabel } from "@/lib/utils";

const hour = (value: string) =>
  new Date(value).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima"
  });

// Cambia el orden de juego: los horarios y canchas quedan fijos, los partidos cambian de casillero.
export function MatchOrderEditor({ data }: { data: CompetitionData }) {
  const events = data.events.filter((event) =>
    data.matches.some((match) => match.eventId === event.id)
  );
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  if (events.length === 0) return null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Orden de los partidos"
        description="Sube o baja un partido para cambiar el orden. Las horas y canchas no cambian; el partido toma el horario de su nueva posicion."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {events.map((event) => (
          <Button
            key={event.id}
            variant={event.id === eventId ? "primary" : "secondary"}
            onClick={() => setEventId(event.id)}
          >
            {event.name}
          </Button>
        ))}
      </div>
      <EventOrder key={eventId} data={data} eventId={eventId} />
    </Card>
  );
}

function EventOrder({ data, eventId }: { data: CompetitionData; eventId: string }) {
  const router = useRouter();
  const event = data.events.find((item) => item.id === eventId);
  const matches = data.matches.filter((match) => match.eventId === eventId).sort(byPlayOrder);
  const [order, setOrder] = useState(() => matches.map((match) => match.id));
  const [saving, setSaving] = useState(false);

  const byId = new Map(matches.map((match) => [match.id, match]));
  const groupName = new Map(data.groups.map((group) => [group.id, group.name.replace(/^Grupo\s+/i, "")]));
  const moves = reorderMoves(matches, order, data.events);
  const preview = new Map(applyMoves(matches, moves).map((match) => [match.id, match]));
  const before = internalViolations(matches, data.events);
  const after = internalViolations([...preview.values()], data.events);
  const locked = event?.fixtureStatus === "locked";

  // Solo se cruza con el vecino de la misma fase y si ninguno de los dos se jugo.
  function canSwap(index: number, target: number) {
    const [a, b] = [byId.get(order[index]), byId.get(order[target])];
    return Boolean(a && b && a.stage === b.stage && !isStartedMatch(a) && !isStartedMatch(b));
  }

  function swap(index: number, target: number) {
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/match-times", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves })
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo guardar el orden.");
        return;
      }
      toast.success(`Orden guardado: ${moves.length} partido(s) cambiaron de horario.`);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el orden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {locked ? (
        <p className="text-sm font-semibold text-red-800">
          El fixture esta bloqueado; desbloquealo para cambiar el orden.
        </p>
      ) : null}

      <ol className="divide-y divide-brand-towerMid/20 rounded-lg ring-1 ring-brand-towerMid/25">
        {order.map((id, index) => {
          const match = preview.get(id)!;
          const moved = moves.some((move) => move.id === id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm",
                moved && "bg-brand-yellow/25"
              )}
            >
              <span className="w-7 text-right font-black text-brand-navy">{index + 1}</span>
              <span className="w-24 shrink-0 text-xs font-semibold text-brand-muted">
                {hour(match.scheduledAt)} · {match.court}
              </span>
              <span className="w-12 shrink-0">
                <Badge tone="blue">
                  {match.stage === "group_stage"
                    ? groupName.get(match.groupId ?? "") ?? "-"
                    : match.label ?? "-"}
                </Badge>
              </span>
              <span className="min-w-0 flex-1 truncate font-bold text-ink">
                {getMatchSideLabel(match, data.teams, "home")}{" "}
                <span className="font-semibold text-brand-muted">vs</span>{" "}
                {getMatchSideLabel(match, data.teams, "away")}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Subir"
                  disabled={locked || index === 0 || !canSwap(index, index - 1)}
                  onClick={() => swap(index, index - 1)}
                  className="rounded p-1 text-brand-navy hover:bg-brand-electric/10 disabled:opacity-25"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Bajar"
                  disabled={locked || index === order.length - 1 || !canSwap(index, index + 1)}
                  onClick={() => swap(index, index + 1)}
                  className="rounded p-1 text-brand-navy hover:bg-brand-electric/10 disabled:opacity-25"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {after > before ? (
        <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Con este orden hay {after} problema(s): un equipo juega dos partidos a la vez o sin su
          descanso minimo ({event?.minimumRestMinutes ?? 0} min). Revisa antes de guardar.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={moves.length === 0 || saving || locked} onClick={() => void save()}>
          <Save className="h-4 w-4" />
          Guardar orden{moves.length ? ` (${moves.length})` : ""}
        </Button>
        <Button
          variant="secondary"
          disabled={moves.length === 0 || saving}
          onClick={() => setOrder(matches.map((match) => match.id))}
        >
          <RotateCcw className="h-4 w-4" />
          Deshacer
        </Button>
        <Button variant="secondary" href={`/imprimir/grupos?evento=${eventId}&pdf=1`}>
          <Printer className="h-4 w-4" />
          Imprimir PDF
        </Button>
      </div>
    </div>
  );
}
