import type { CompetitionData } from "../data-mappers";
import {
  filterMatchesByCategory,
  filterTeamsByCategory,
  findCategoryBySlug,
  getSelectableEventCategories,
  resolveEventCategory
} from "../domain/categories";
import { matchesChampionshipSlug, visiblePublicEvents } from "../domain/tournament-format";
import { buildStandings } from "../domain/standings";

export function getPublicEvents(data: CompetitionData) {
  return visiblePublicEvents(data.events);
}

export function getSelectedPublicEvent(data: CompetitionData, slugOrId?: string) {
  const events = getPublicEvents(data);
  return (
    events.find((event) => matchesChampionshipSlug(event, slugOrId)) ??
    events[0] ??
    null
  );
}

export function getChampionshipPublicContext(
  data: CompetitionData,
  slugOrId?: string,
  categorySlug?: string
) {
  const event = getSelectedPublicEvent(data, slugOrId);
  if (!event) {
    return {
      event: null,
      events: [],
      categories: [],
      selectedCategory: null,
      teams: [],
      players: [],
      matches: [],
      standings: [],
      groups: [],
      groupTeams: [],
      groupStandings: [],
      bases: null,
      venues: data.venues
    };
  }

  const categories = getSelectableEventCategories(data, event.id);
  const selectedCategory =
    findCategoryBySlug(categories, categorySlug) ??
    categories[0] ??
    null;
  const resolvedEvent = {
    ...event,
    category: resolveEventCategory(event, selectedCategory ? [selectedCategory] : categories)
  };
  const eventTeams = data.teams.filter((team) => team.eventId === event.id);
  const teams = filterTeamsByCategory(eventTeams, selectedCategory?.id);
  const teamIds = new Set(teams.map((team) => team.id));
  const eventMatches = data.matches.filter((match) => match.eventId === event.id);
  const matches = filterMatchesByCategory(eventMatches, eventTeams, selectedCategory?.id).filter(isPublicMatchVisible);
  const eventGroups = data.groups.filter((group) => group.eventId === event.id);
  const groupIds = new Set(eventGroups.map((group) => group.id));
  const groupTeams = data.groupTeams.filter(
    (row) => groupIds.has(row.groupId) && (teamIds.size === 0 || teamIds.has(row.teamId))
  );
  const groupStandings = data.groupStandings.filter(
    (row) => groupIds.has(row.groupId) && (teamIds.size === 0 || teamIds.has(row.teamId))
  );
  const categoryGroupIds = new Set(groupTeams.map((row) => row.groupId));
  const groups =
    selectedCategory && categoryGroupIds.size > 0
      ? eventGroups.filter((group) => categoryGroupIds.has(group.id))
      : eventGroups;

  return {
    event: resolvedEvent,
    events: getPublicEvents(data),
    categories,
    selectedCategory,
    teams,
    players: data.players.filter((player) => teamIds.has(player.teamId)),
    matches,
    standings: buildStandings(resolvedEvent, teams, matches),
    groups,
    groupTeams,
    groupStandings,
    bases:
      data.tournamentBases.find((base) =>
        base.championshipName.toLowerCase().includes(resolvedEvent.name.toLowerCase())
      ) ??
      data.tournamentBases.find((base) => base.published) ??
      data.tournamentBases[0] ??
      null,
    venues: data.venues
  };
}

export function getFixtureContext(data: CompetitionData) {
  return {
    events: getPublicEvents(data),
    teams: data.teams,
    players: data.players,
    matches: data.matches.filter(isPublicMatchVisible),
    categories: data.categories,
    venues: data.venues
  };
}

function isPublicMatchVisible(match: CompetitionData["matches"][number]) {
  return match.status === "scheduled" || match.status === "in_progress" || match.status === "validated" || match.status === "finished";
}
