import type { TournamentEvent } from "../types";

export function championshipSlug(event: Pick<TournamentEvent, "id" | "name">) {
  const slug = event.name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || event.id;
}

export function matchesChampionshipSlug(
  event: Pick<TournamentEvent, "id" | "name">,
  value?: string
) {
  if (!value) return false;
  return event.id === value || championshipSlug(event) === value;
}

export function sportDisplayName(event: Pick<TournamentEvent, "sport" | "category">) {
  const sportNames: Record<TournamentEvent["sport"], string> = {
    futsal: "Futsal",
    voley: "Voley",
    futbol: "Futbol"
  };

  return `${sportNames[event.sport]} ${event.category}`.trim();
}

export function tournamentFormatLabel(format: TournamentEvent["format"]) {
  const labels: Record<TournamentEvent["format"], string> = {
    league: "Liga por puntos",
    single_elimination: "Eliminacion directa",
    groups_then_knockout: "Grupos + eliminacion"
  };

  return labels[format];
}

export function eventStatusTone(status: TournamentEvent["status"]) {
  if (status === "registration") return "green";
  if (status === "in_progress") return "blue";
  if (status === "finished") return "neutral";
  return "amber";
}

export function visiblePublicEvents(events: TournamentEvent[]) {
  const published = events.filter((event) => event.status !== "draft");
  return published.length > 0 ? published : events;
}
