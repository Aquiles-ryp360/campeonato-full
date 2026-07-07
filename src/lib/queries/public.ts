import type { CompetitionData } from "../data-mappers";
import { findBasesForEvent } from "../bases-documents";
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

export function getChampionshipPublicContext(data: CompetitionData, slugOrId?: string) {
  const event = getSelectedPublicEvent(data, slugOrId);
  if (!event) {
    return {
      event: null,
      events: [],
      teams: [],
      players: [],
      matches: [],
      standings: [],
      groups: [],
      groupTeams: [],
      groupStandings: [],
      matchLiveEvents: [],
      bases: null,
      venues: data.venues
    };
  }

  const teams = data.teams.filter((team) => team.eventId === event.id);
  const teamIds = new Set(teams.map((team) => team.id));
  const matches = data.matches.filter((match) => match.eventId === event.id);
  const matchIds = new Set(matches.map((match) => match.id));
  const groups = data.groups.filter((group) => group.eventId === event.id);
  const groupIds = new Set(groups.map((group) => group.id));
  const groupTeams = data.groupTeams.filter((row) => groupIds.has(row.groupId));
  const groupStandings = data.groupStandings.filter((row) => groupIds.has(row.groupId));

  return {
    event,
    events: getPublicEvents(data),
    teams,
    players: data.players.filter((player) => teamIds.has(player.teamId)),
    matches,
    matchLiveEvents: (data.matchLiveEvents ?? []).filter((item) => matchIds.has(item.matchId)),
    standings: buildStandings(event, data.teams, data.matches),
    groups,
    groupTeams,
    groupStandings,
    bases: findBasesForEvent(event, data.tournamentBases),
    venues: data.venues
  };
}

export function getFixtureContext(data: CompetitionData) {
  return {
    events: getPublicEvents(data),
    teams: data.teams,
    players: data.players,
    matches: data.matches,
    venues: data.venues
  };
}
