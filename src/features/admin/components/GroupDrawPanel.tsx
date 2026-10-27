"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Shuffle } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { defaultGroupCount, groupSizes, supportsGroupKnockout } from "@/lib/domain/group-draw";
import { Badge, Button, Card, ConfirmDialog, Field, SectionHeader, inputClass } from "@/components/ui";

type DrawResponse = {
  ok?: boolean;
  error?: string;
  matchCount?: number;
  groups?: Array<{ name: string; teams: string[] }>;
};

export function GroupDrawPanel({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const groupEvents = data.events.filter((event) => event.format === "groups_then_knockout");
  const [eventId, setEventId] = useState(groupEvents[0]?.id ?? "");
  const [teamScope, setTeamScope] = useState<"approved" | "active">("active");
  const [groupCountInput, setGroupCountInput] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<DrawResponse["groups"]>();

  if (groupEvents.length === 0) return null;

  const event = groupEvents.find((item) => item.id === eventId);
  const scopeStatuses = teamScope === "approved" ? ["approved"] : ["registered", "observed", "approved"];
  const teamCount = data.teams.filter((team) => team.eventId === eventId && scopeStatuses.includes(team.status)).length;
  const groupCount = groupCountInput ?? defaultGroupCount(teamCount);
  const hasGroups = data.groups.some((group) => group.eventId === eventId);
  const locked = event?.fixtureStatus === "published" || event?.fixtureStatus === "locked";
  const canDraw = teamCount >= groupCount * 2 && supportsGroupKnockout(groupCount) && !locked;

  async function runDraw() {
    setDrawing(true);
    try {
      const response = await fetch("/api/admin/group-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, groupCount, teamScope })
      });
      const payload = (await response.json().catch(() => null)) as DrawResponse | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo realizar el sorteo.");
        return;
      }

      setResult(payload?.groups);
      toast.success(`Sorteo listo: ${payload?.matchCount ?? 0} partidos programados.`);
      router.refresh();
    } catch {
      toast.error("No se pudo realizar el sorteo.");
    } finally {
      setDrawing(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Sorteo de grupos"
        description="Reparte al azar los equipos, crea los partidos de grupo con horario y arma la llave final (1ro Grupo A, 2do Grupo B...)."
        action={hasGroups ? <Badge tone="green">Grupos sorteados</Badge> : <Badge tone="blue">Sin sortear</Badge>}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Field label="Campeonato">
          <select
            className={inputClass}
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setGroupCountInput(null);
              setResult(undefined);
            }}
          >
            {groupEvents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Equipos que entran">
          <select className={inputClass} value={teamScope} onChange={(e) => setTeamScope(e.target.value as "approved" | "active")}>
            <option value="active">Todos los inscritos (aprobados, inscritos y observados)</option>
            <option value="approved">Solo aprobados</option>
          </select>
        </Field>
        <Field label="Numero de grupos">
          <select className={inputClass} value={groupCount} onChange={(e) => setGroupCountInput(Number(e.target.value))}>
            {[2, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} grupos
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-bold text-ink">Reparto</span>
          <p className="min-h-10 rounded-md bg-brand-electric/5 px-3 py-2 text-sm font-semibold text-brand-navy">
            {teamCount} equipos
            {teamCount >= groupCount * 2 ? ` · ${groupSizes(teamCount, groupCount).join("-")}` : ""}
          </p>
        </div>
      </div>

      {locked ? (
        <p className="mt-4 text-sm font-semibold text-red-800">
          El fixture ya esta publicado o bloqueado; no se puede volver a sortear.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!canDraw || drawing} onClick={() => setConfirming(true)}>
          <Shuffle className="h-4 w-4" />
          {hasGroups ? "Volver a sortear" : "Sortear grupos"}
        </Button>
        <Button variant="secondary" href={`/imprimir/grupos?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          Imprimir tablas por grupo
        </Button>
        <Button variant="secondary" href={`/imprimir/fichas?evento=${eventId}`}>
          <Printer className="h-4 w-4" />
          Imprimir fichas de todos los equipos
        </Button>
      </div>

      {result ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {result.map((group) => (
            <div key={group.name} className="rounded-md border border-brand-towerMid/25 p-3">
              <p className="text-sm font-black text-brand-navy">{group.name}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-semibold text-ink">
                {group.teams.map((team) => (
                  <li key={team}>{team}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={hasGroups ? "Volver a sortear" : "Sortear grupos"}
        description={
          hasGroups
            ? "Se borraran los grupos y partidos actuales y se generara un sorteo nuevo."
            : `Se repartiran ${teamCount} equipos en ${groupCount} grupos y se creara el fixture completo.`
        }
        confirmLabel="Sortear"
        destructive={hasGroups}
        busy={drawing}
        onConfirm={() => void runDraw()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
