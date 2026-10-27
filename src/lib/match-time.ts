import type { Match, TournamentEvent } from "./types";
import { formatDateTime, formatShortDate } from "./utils";

// La hora de cada partido solo la ve el admin. Para el resto se reemplaza
// scheduledAt por el inicio del dia (hora de Lima) + N segundos: el orden se
// mantiene para listar, pero la hora real no sale del servidor.
export function hideMatchTimes(matches: Match[]): Match[] {
  const order = new Map(
    [...matches]
      .filter((match) => match.scheduledAt)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || (a.label ?? "").localeCompare(b.label ?? ""))
      .map((match, index) => [match.id, index] as const)
  );

  return matches.map((match) => {
    const index = order.get(match.id);
    if (index === undefined) return { ...match, timeHidden: true };

    const dayStart = new Date(`${limaDay(match.scheduledAt)}T00:00:00-05:00`).getTime();
    return {
      ...match,
      scheduledAt: new Date(dayStart + index * 1000).toISOString(),
      scheduledEndAt: undefined,
      timeHidden: true,
      scheduleOrder: index + 1
    };
  });
}

export function hideEventMatchTimes(events: TournamentEvent[]): TournamentEvent[] {
  return events.map((event) => ({ ...event, hideMatchTimes: true }));
}

// Texto para mostrar cuando se programa un partido.
export function matchScheduleLabel(match: Pick<Match, "scheduledAt" | "timeHidden" | "scheduleOrder">) {
  if (!match.scheduledAt) return "Por programar";
  if (!match.timeHidden) return formatDateTime(match.scheduledAt);

  const day = formatShortDate(match.scheduledAt);
  return match.scheduleOrder ? `${day} · Partido N.° ${match.scheduleOrder}` : day;
}

function limaDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(value));
}
