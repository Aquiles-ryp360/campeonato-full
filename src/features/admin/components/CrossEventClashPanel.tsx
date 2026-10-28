"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Clock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import {
  clashOptions,
  eventEndTimes,
  findClashes,
  linkTeams,
  resolveAllClashes,
  shiftEventAfter,
  type MatchMove
} from "@/lib/domain/cross-event-clashes";
import type { Match } from "@/lib/types";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";

const hour = (value: string) =>
  new Date(value).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima"
  });

export function CrossEventClashPanel({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const [applying, setApplying] = useState<string>();
  const [ignored, setIgnored] = useState<string[]>([]);

  const links = linkTeams(data.teams, data.players);
  if (links.length === 0) return null;

  const clashes = findClashes(data.matches, data.events, links);
  const eventName = new Map(data.events.map((event) => [event.id, event.name]));
  const teamName = new Map(data.teams.map((team) => [team.id, team.name]));
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const describe = (match: Match) =>
    `${match.label ?? "Partido"} · ${teamName.get(match.homeTeamId) ?? "?"} vs ${teamName.get(match.awayTeamId) ?? "?"} · ${hour(match.scheduledAt)} · ${match.court}`;

  function optionText(option: {
    kind: string;
    matchId: string;
    swapWithId?: string;
    delayMinutes?: number;
    moves: MatchMove[];
  }) {
    const target = matchById.get(option.matchId)!;
    const sport = eventName.get(target.eventId) ?? "";
    if (option.kind === "swap") {
      const other = matchById.get(option.swapWithId!)!;
      return {
        title: `Intercambiar horario en ${sport}`,
        detail: `${target.label} pasa a las ${hour(other.scheduledAt)} (${other.court}) y ${other.label} a las ${hour(target.scheduledAt)} (${target.court}). No mueve ningun otro partido.`
      };
    }
    const last = option.moves.reduce(
      (max, move) => (move.scheduledEndAt > max ? move.scheduledEndAt : max),
      ""
    );
    return {
      title: `Retrasar ${target.court} de ${sport} ${option.delayMinutes} min`,
      detail: `Desde ${target.label} se corren ${option.moves.length} partido(s) de esa cancha; el ultimo termina a las ${hour(last)}.`
    };
  }

  async function apply(option: { key: string; moves: MatchMove[] }) {
    setApplying(option.key);
    try {
      const response = await fetch("/api/admin/match-times", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: option.moves })
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo aplicar el cambio.");
        return;
      }
      toast.success("Horarios actualizados.");
      router.refresh();
    } catch {
      toast.error("No se pudo aplicar el cambio.");
    } finally {
      setApplying(undefined);
    }
  }

  const visible = clashes.filter((clash) => !ignored.includes(`${clash.a.id}-${clash.b.id}`));

  // Soluciones de una vez para todos los cruces.
  const clashEvents = [...new Set(clashes.flatMap((clash) => [clash.a.eventId, clash.b.eventId]))];
  const globalOptions =
    clashes.length === 0
      ? []
      : [
          resolveAllClashes(data.matches, data.events, links),
          ...(clashEvents.length === 2
            ? [
                shiftEventAfter(clashEvents[1], clashEvents[0], data.matches, data.events, links),
                shiftEventAfter(clashEvents[0], clashEvents[1], data.matches, data.events, links)
              ]
            : [])
        ].filter((option) => option !== null);
  const endsText = (moves: MatchMove[]) => {
    const ends = eventEndTimes(data.matches, moves, data.events);
    return clashEvents
      .map(
        (id) => `${eventName.get(id)} termina ${hour(new Date(ends.get(id) ?? 0).toISOString())}`
      )
      .join(" · ");
  };

  return (
    <Card className="p-5">
      <SectionHeader
        title="Cruces entre disciplinas"
        description="Equipos que juegan futsal y voley (mismo nombre o jugadores en comun) con partidos que se pisan o con menos de 10 min entre uno y otro."
        action={
          visible.length ? (
            <Badge tone="red">{visible.length} cruce(s)</Badge>
          ) : (
            <Badge tone="green">Sin cruces</Badge>
          )
        }
      />

      <p className="mt-3 text-xs font-semibold text-brand-muted">
        Equipos vigilados:{" "}
        {links
          .map(
            (link) =>
              `${link.a.name}${link.reason === "jugadores" ? ` / ${link.b.name} (${link.sharedPlayers} jugadores en comun)` : ""}`
          )
          .join(" · ")}
      </p>

      {visible.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          Ningun equipo tiene partidos de las dos disciplinas al mismo tiempo.
        </p>
      ) : null}

      {globalOptions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase text-brand-muted">
            Resolver todos los cruces de una vez
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {globalOptions.map((option) => (
              <div
                key={option.key}
                className="flex flex-col justify-between gap-2 rounded-md bg-brand-electric/5 p-3 ring-1 ring-brand-electric/20"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-brand-navy">
                    {option.kind === "auto" ? (
                      <Wand2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {option.kind === "auto"
                      ? "Reacomodar automaticamente"
                      : `Empezar ${eventName.get(option.shiftedEventId!)} al terminar la otra`}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-muted">
                    {option.kind === "auto"
                      ? `Intercambia o retrasa solo los partidos necesarios (${option.moves.length} cambian).`
                      : `Corre todos sus partidos ${option.delayMinutes} min.`}{" "}
                    {endsText(option.moves)}.
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold ${option.clashesAfter === 0 ? "text-green-800" : "text-red-800"}`}
                  >
                    {option.clashesAfter === 0
                      ? "Deja todo sin cruces"
                      : `Quedarian ${option.clashesAfter} cruce(s) para ver a mano`}
                  </p>
                </div>
                <Button disabled={Boolean(applying)} onClick={() => void apply(option)}>
                  {applying === option.key ? "Aplicando..." : "Aplicar"}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-brand-muted">Ahora: {endsText([])}.</p>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-black text-brand-navy">
            Ver cada cruce y resolverlo uno por uno
          </summary>
          <div className="mt-4 space-y-4">
            {visible.map((clash) => {
              const key = `${clash.a.id}-${clash.b.id}`;
              const options = clashOptions(clash, data.matches, data.events, links);
              return (
                <div key={key} className="rounded-md border border-coral/30 bg-coral/5 p-4">
                  <p className="flex items-start gap-2 text-sm font-black text-red-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {clash.link.a.name}
                    {clash.link.reason === "jugadores" ? ` / ${clash.link.b.name}` : ""} juega dos
                    partidos a la vez
                  </p>
                  <ul className="mt-2 space-y-0.5 pl-6 text-sm font-semibold text-ink">
                    <li>
                      {eventName.get(clash.a.eventId)}: {describe(clash.a)}
                    </li>
                    <li>
                      {eventName.get(clash.b.eventId)}: {describe(clash.b)}
                    </li>
                  </ul>

                  <p className="mt-3 text-xs font-black uppercase text-brand-muted">
                    Elige una solucion
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {options.map((option) => {
                      const text = optionText(option);
                      return (
                        <div
                          key={option.key}
                          className="flex flex-col justify-between gap-2 rounded-md bg-white p-3 ring-1 ring-brand-towerMid/25"
                        >
                          <div>
                            <p className="flex items-center gap-2 text-sm font-black text-brand-navy">
                              {option.kind === "swap" ? (
                                <ArrowLeftRight className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                              {text.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-brand-muted">
                              {text.detail}
                            </p>
                            <p className="mt-1 text-xs font-bold text-green-800">
                              {option.clashesAfter === 0
                                ? "Deja todo sin cruces"
                                : `Quedarian ${option.clashesAfter} cruce(s)`}
                            </p>
                          </div>
                          <Button disabled={Boolean(applying)} onClick={() => void apply(option)}>
                            {applying === option.key ? "Aplicando..." : "Aplicar"}
                          </Button>
                        </div>
                      );
                    })}
                    <div className="flex flex-col justify-between gap-2 rounded-md bg-white p-3 ring-1 ring-brand-towerMid/25">
                      <div>
                        <p className="text-sm font-black text-brand-navy">Dejarlo asi</p>
                        <p className="mt-1 text-xs font-semibold text-brand-muted">
                          Si el equipo usa jugadores distintos en cada disciplina o lo resuelven en
                          la cancha. Vuelve a aparecer al recargar.
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => setIgnored([...ignored, key])}>
                        Ignorar
                      </Button>
                    </div>
                  </div>
                  {options.length === 0 ? (
                    <p className="mt-2 text-xs font-semibold text-red-800">
                      No hay un cambio automatico que lo resuelva sin crear otro problema; ajustalo
                      a mano.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
