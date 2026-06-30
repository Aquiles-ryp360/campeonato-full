import type { CompetitionData } from "../data-mappers";
import type { Category, Match, Team, TournamentEvent } from "../types";

export function getEventCategories(data: CompetitionData, eventId: string) {
  return data.categories
    .filter((category) => category.eventId === eventId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getSelectableEventCategories(data: CompetitionData, eventId: string) {
  return getEventCategories(data, eventId).filter((category) => category.active && category.published);
}

export function findCategoryBySlug(categories: Category[], value?: string | null) {
  if (!value) return null;
  const normalized = normalizeCategoryKey(value);
  return (
    categories.find((category) => category.id === value) ??
    categories.find((category) => normalizeCategoryKey(category.slug) === normalized) ??
    categories.find((category) => normalizeCategoryKey(category.name) === normalized) ??
    null
  );
}

export function resolveEventCategory(event: TournamentEvent, categories: Category[]) {
  return categories[0]?.name ?? event.category;
}

export function filterTeamsByCategory(teams: Team[], categoryId?: string | null) {
  if (!categoryId) return teams;
  return teams.filter((team) => team.categoryId === categoryId);
}

export function filterMatchesByCategory(matches: Match[], teams: Team[], categoryId?: string | null) {
  if (!categoryId) return matches;

  const teamCategories = new Map(teams.map((team) => [team.id, team.categoryId]));

  return matches.filter((match) => {
    if (match.categoryId === categoryId) return true;

    const homeCategoryId = teamCategories.get(match.homeTeamId);
    const awayCategoryId = teamCategories.get(match.awayTeamId);

    return homeCategoryId === categoryId || awayCategoryId === categoryId;
  });
}

export function categoryLabel(category?: Category | null) {
  return category?.name ?? "General";
}

function normalizeCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
