import type { Match, Player, Team, TournamentEvent } from "../types";

// Cruces entre campeonatos del mismo dia: un equipo (o sus jugadores) con partidos que se pisan en dos disciplinas.

export type TeamLink = { a: Team; b: Team; reason: "nombre" | "jugadores"; sharedPlayers: number };
export type Clash = { link: TeamLink; a: Match; b: Match };
export type MatchMove = {
  id: string;
  scheduledAt: string;
  scheduledEndAt: string;
  venueId: string | null;
  court: string;
};
export type ClashOption = {
  key: string;
  kind: "swap" | "delay";
  matchId: string;
  moves: MatchMove[];
  clashesAfter: number;
  delayMinutes?: number;
  swapWithId?: string;
};

// ponytail: margen fijo para cambiarse de cancha y de ropa; si las canchas estan lejos, subirlo.
export const CROSS_EVENT_BUFFER_MINUTES = 10;
const MINUTE = 60_000;

const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

// Equipos de campeonatos distintos que son "el mismo": mismo nombre o al menos un DNI en comun.
export function linkTeams(teams: Team[], players: Player[]): TeamLink[] {
  const dnis = new Map<string, Set<string>>();
  for (const player of players) {
    const dni = player.dni?.trim();
    if (!dni) continue;
    dnis.set(player.teamId, (dnis.get(player.teamId) ?? new Set()).add(dni));
  }

  const links: TeamLink[] = [];
  teams.forEach((a, index) => {
    for (const b of teams.slice(index + 1)) {
      if (a.eventId === b.eventId) continue;
      const shared = [...(dnis.get(a.id) ?? [])].filter((dni) => dnis.get(b.id)?.has(dni)).length;
      if (normalizeName(a.name) === normalizeName(b.name))
        links.push({ a, b, reason: "nombre", sharedPlayers: shared });
      else if (shared > 0) links.push({ a, b, reason: "jugadores", sharedPlayers: shared });
    }
  });
  return links;
}

export function isStartedMatch(match: Match) {
  const live = match.liveStatus ?? "scheduled";
  return (
    match.status !== "scheduled" ||
    !["scheduled", "cancelled"].includes(live) ||
    match.homeScore !== undefined ||
    match.awayScore !== undefined ||
    Boolean(match.winnerTeamId)
  );
}

function span(match: Match, events: Map<string, TournamentEvent>) {
  const start = Date.parse(match.scheduledAt);
  if (!match.scheduledAt || Number.isNaN(start)) return null;
  const end = match.scheduledEndAt ? Date.parse(match.scheduledEndAt) : NaN;
  const duration = events.get(match.eventId)?.scheduleConfig?.matchDurationMinutes ?? 20;
  return { start, end: Number.isNaN(end) ? start + duration * MINUTE : end };
}

const plays = (match: Match, teamId: string) =>
  match.homeTeamId === teamId || match.awayTeamId === teamId;

function overlaps(x: Match, y: Match, events: Map<string, TournamentEvent>, gapMinutes: number) {
  const [a, b] = [span(x, events), span(y, events)];
  if (!a || !b) return false;
  const gap = gapMinutes * MINUTE;
  return a.start < b.end + gap && b.start < a.end + gap;
}

export function findClashes(
  matches: Match[],
  events: TournamentEvent[],
  links: TeamLink[]
): Clash[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  return links.flatMap((link) => {
    const sideA = matches.filter(
      (match) => match.eventId === link.a.eventId && plays(match, link.a.id)
    );
    const sideB = matches.filter(
      (match) => match.eventId === link.b.eventId && plays(match, link.b.id)
    );
    return sideA.flatMap((a) =>
      sideB
        .filter((b) => overlaps(a, b, byId, CROSS_EVENT_BUFFER_MINUTES))
        .map((b) => ({ link, a, b }))
    );
  });
}

// Problemas dentro de un mismo campeonato: misma cancha a la vez o un equipo sin su descanso minimo.
export function internalViolations(matches: Match[], events: TournamentEvent[]) {
  const byId = new Map(events.map((event) => [event.id, event]));
  let count = 0;
  matches.forEach((x, index) => {
    for (const y of matches.slice(index + 1)) {
      if (x.eventId !== y.eventId) continue;
      if (x.court === y.court && overlaps(x, y, byId, 0)) count += 1;
      const shareTeam = [x.homeTeamId, x.awayTeamId].some((id) => id && plays(y, id));
      if (shareTeam && overlaps(x, y, byId, byId.get(x.eventId)?.minimumRestMinutes ?? 0))
        count += 1;
    }
  });
  return count;
}

const iso = (ms: number) => new Date(ms).toISOString();
const toMove = (match: Match, events: Map<string, TournamentEvent>): MatchMove => ({
  id: match.id,
  scheduledAt: match.scheduledAt,
  scheduledEndAt: iso(span(match, events)!.end),
  venueId: match.venueId ?? null,
  court: match.court
});

// Orden de juego de un campeonato: por hora y luego por cancha.
export const byPlayOrder = (a: Match, b: Match) =>
  a.scheduledAt.localeCompare(b.scheduledAt) || a.court.localeCompare(b.court);

// Reordenar partidos: los horarios/canchas quedan fijos y cada partido toma el casillero
// de su nueva posicion. Devuelve solo los partidos que cambian.
export function reorderMoves(matches: Match[], orderedIds: string[], events: TournamentEvent[]) {
  const byEvent = new Map(events.map((event) => [event.id, event]));
  const slots = [...matches].sort(byPlayOrder).map((match) => toMove(match, byEvent));
  return orderedIds.flatMap((id, index) =>
    slots[index].id === id ? [] : [{ ...slots[index], id }]
  );
}

export function applyMoves(matches: Match[], moves: MatchMove[]): Match[] {
  const byId = new Map(moves.map((move) => [move.id, move]));
  return matches.map((match) => {
    const move = byId.get(match.id);
    return move
      ? {
          ...match,
          scheduledAt: move.scheduledAt,
          scheduledEndAt: move.scheduledEndAt,
          venueId: move.venueId ?? undefined,
          court: move.court
        }
      : match;
  });
}

// Alternativas para un cruce, moviendo uno u otro partido. Solo se ofrecen las que bajan los cruces
// sin crear problemas nuevos dentro del campeonato. Ordenadas: primero las que resuelven todo.
export function clashOptions(
  clash: Clash,
  matches: Match[],
  events: TournamentEvent[],
  links: TeamLink[]
): ClashOption[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const before = findClashes(matches, events, links).length;
  const internalBefore = internalViolations(matches, events);
  const options: ClashOption[] = [];

  const consider = (option: Omit<ClashOption, "clashesAfter">) => {
    const next = applyMoves(matches, option.moves);
    const clashesAfter = findClashes(next, events, links).length;
    if (clashesAfter < before && internalViolations(next, events) <= internalBefore)
      options.push({ ...option, clashesAfter });
  };

  for (const [target, other] of [
    [clash.a, clash.b],
    [clash.b, clash.a]
  ] as const) {
    if (isStartedMatch(target)) continue;
    const targetSpan = span(target, byId);
    const otherSpan = span(other, byId);
    if (!targetSpan || !otherSpan) continue;

    // 1) Intercambiar horario y cancha con otro partido de grupo del mismo campeonato (el mas cercano que sirva).
    const swaps = matches
      .filter(
        (match) =>
          match.eventId === target.eventId &&
          match.id !== target.id &&
          match.stage === "group_stage" &&
          target.stage === "group_stage"
      )
      .filter((match) => !isStartedMatch(match) && span(match, byId))
      .sort(
        (x, y) =>
          Math.abs(Date.parse(x.scheduledAt) - targetSpan.start) -
          Math.abs(Date.parse(y.scheduledAt) - targetSpan.start)
      );
    const optionCount = options.length;
    for (const candidate of swaps) {
      consider({
        key: `swap-${target.id}-${candidate.id}`,
        kind: "swap",
        matchId: target.id,
        swapWithId: candidate.id,
        moves: [
          { ...toMove(candidate, byId), id: target.id },
          { ...toMove(target, byId), id: candidate.id }
        ]
      });
      if (options.length > optionCount) break;
    }

    // 2) Retrasar su cancha desde ese partido hasta que el otro termine (+ margen); los siguientes se corren igual.
    const delayMinutes =
      Math.ceil(
        (otherSpan.end + CROSS_EVENT_BUFFER_MINUTES * MINUTE - targetSpan.start) / MINUTE / 5
      ) * 5;
    const shifted = matches.filter(
      (match) =>
        match.eventId === target.eventId &&
        match.court === target.court &&
        Date.parse(match.scheduledAt) >= targetSpan.start
    );
    if (delayMinutes > 0 && shifted.every((match) => !isStartedMatch(match))) {
      consider({
        key: `delay-${target.id}`,
        kind: "delay",
        matchId: target.id,
        delayMinutes,
        moves: shifted.map((match) => {
          const matchSpan = span(match, byId)!;
          return {
            ...toMove(match, byId),
            scheduledAt: iso(matchSpan.start + delayMinutes * MINUTE),
            scheduledEndAt: iso(matchSpan.end + delayMinutes * MINUTE)
          };
        })
      });
    }
  }

  return options.sort((x, y) => x.clashesAfter - y.clashesAfter || x.moves.length - y.moves.length);
}

export type GlobalOption = {
  key: string;
  kind: "auto" | "shift";
  moves: MatchMove[];
  clashesAfter: number;
  shiftedEventId?: string;
  delayMinutes?: number;
};

function mergeMoves(previous: MatchMove[], next: MatchMove[]) {
  const byId = new Map(previous.map((move) => [move.id, move]));
  for (const move of next) byId.set(move.id, move);
  return [...byId.values()];
}

// Aplica una y otra vez la mejor alternativa del primer cruce hasta que no quede ninguno o ya no mejore.
// ponytail: voraz, no busca el minimo global; suele dejar 0 cruces con pocos equipos compartidos.
export function resolveAllClashes(
  matches: Match[],
  events: TournamentEvent[],
  links: TeamLink[]
): GlobalOption | null {
  let current = matches;
  let moves: MatchMove[] = [];
  for (let step = 0; step < 60; step += 1) {
    const clashes = findClashes(current, events, links);
    if (clashes.length === 0) break;
    const best = clashes
      .map((clash) => clashOptions(clash, current, events, links)[0])
      .filter(Boolean)
      .sort((x, y) => x.clashesAfter - y.clashesAfter || x.moves.length - y.moves.length)[0];
    if (!best) break;
    current = applyMoves(current, best.moves);
    moves = mergeMoves(moves, best.moves);
  }
  if (moves.length === 0) return null;
  return {
    key: "auto",
    kind: "auto",
    moves,
    clashesAfter: findClashes(current, events, links).length
  };
}

// Corre todo un campeonato para que empiece cuando el otro termina (+ margen). Cero cruces seguro, pero termina mas tarde.
export function shiftEventAfter(
  shiftedEventId: string,
  otherEventId: string,
  matches: Match[],
  events: TournamentEvent[],
  links: TeamLink[]
): GlobalOption | null {
  const byId = new Map(events.map((event) => [event.id, event]));
  const shifted = matches.filter((match) => match.eventId === shiftedEventId && span(match, byId));
  const otherEnd = Math.max(
    ...matches
      .filter((match) => match.eventId === otherEventId)
      .map((match) => span(match, byId)?.end ?? 0)
  );
  if (
    shifted.length === 0 ||
    !Number.isFinite(otherEnd) ||
    otherEnd <= 0 ||
    shifted.some(isStartedMatch)
  )
    return null;
  const firstStart = Math.min(...shifted.map((match) => span(match, byId)!.start));
  const delayMinutes =
    Math.ceil((otherEnd + CROSS_EVENT_BUFFER_MINUTES * MINUTE - firstStart) / MINUTE / 5) * 5;
  if (delayMinutes <= 0) return null;
  const moves = shifted.map((match) => {
    const matchSpan = span(match, byId)!;
    return {
      ...toMove(match, byId),
      scheduledAt: iso(matchSpan.start + delayMinutes * MINUTE),
      scheduledEndAt: iso(matchSpan.end + delayMinutes * MINUTE)
    };
  });
  return {
    key: `shift-${shiftedEventId}`,
    kind: "shift",
    moves,
    shiftedEventId,
    delayMinutes,
    clashesAfter: findClashes(applyMoves(matches, moves), events, links).length
  };
}

// Hora en que termina cada campeonato despues de aplicar los cambios.
export function eventEndTimes(matches: Match[], moves: MatchMove[], events: TournamentEvent[]) {
  const byId = new Map(events.map((event) => [event.id, event]));
  const next = applyMoves(matches, moves);
  return new Map(
    events.map((event) => [
      event.id,
      Math.max(
        0,
        ...next
          .filter((match) => match.eventId === event.id)
          .map((match) => span(match, byId)?.end ?? 0)
      )
    ])
  );
}
