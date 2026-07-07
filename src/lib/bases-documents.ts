import type { SportKey, TournamentBases, TournamentEvent } from "./types";

const officialBasesPdfBySport: Partial<Record<SportKey, string>> = {
  futbol: "/bases/bases-futbol-11-2026.pdf",
  voley: "/bases/bases-voley-mixto-2026.pdf"
};

export function getOfficialBasesPdfHref(
  event: Pick<TournamentEvent, "name" | "sport">,
  bases?: Pick<TournamentBases, "championshipName"> | null
) {
  const sportHref = officialBasesPdfBySport[event.sport];
  if (sportHref) return sportHref;

  const text = normalizeText(`${event.name} ${bases?.championshipName ?? ""}`);
  if (text.includes("voley") || text.includes("volley")) return officialBasesPdfBySport.voley;
  if (text.includes("futbol") || text.includes("football")) return officialBasesPdfBySport.futbol;

  return undefined;
}

export function getOfficialBasesDownloadName(event: Pick<TournamentEvent, "sport">) {
  if (event.sport === "voley") return "bases-voley-mixto-2026.pdf";
  if (event.sport === "futbol") return "bases-futbol-11-2026.pdf";
  return "bases-campeonato-2026.pdf";
}

export function findBasesForEvent(event: TournamentEvent, bases: TournamentBases[]) {
  const eventName = normalizeText(event.name);
  const exact = bases.find((base) => normalizeText(base.championshipName) === eventName);
  if (exact) return exact;

  const relatedByName = bases.find((base) => {
    const baseName = normalizeText(base.championshipName);
    return baseName.includes(eventName) || eventName.includes(baseName);
  });
  if (relatedByName) return relatedByName;

  const relatedBySport = bases.find((base) => isBaseForSport(base, event.sport));
  return relatedBySport ?? bases.find((base) => base.published) ?? bases[0] ?? null;
}

function isBaseForSport(base: TournamentBases, sport: SportKey) {
  const name = normalizeText(base.championshipName);
  if (sport === "voley") return name.includes("voley") || name.includes("volley");
  if (sport === "futbol") return name.includes("futbol") || name.includes("football");
  return name.includes("futsal");
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
