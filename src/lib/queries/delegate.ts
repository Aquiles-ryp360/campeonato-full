import type { CompetitionData } from "../data-mappers";

export function getDelegateTeams(data: CompetitionData, delegateEmail?: string | null) {
  const normalized = delegateEmail?.toLowerCase() ?? "";
  const teams = normalized
    ? data.teams.filter((team) => team.delegateEmail.toLowerCase() === normalized)
    : [];

  if (teams.length > 0) return teams;
  if (normalized === "delegado") return data.teams.slice(0, 1);
  return [];
}

export function getDelegateTeamContext(data: CompetitionData, teamId?: string, delegateEmail?: string | null) {
  const delegateTeams = getDelegateTeams(data, delegateEmail);
  const team = delegateTeams.find((item) => item.id === teamId) ?? delegateTeams[0] ?? null;
  const event = team ? data.events.find((item) => item.id === team.eventId) ?? null : null;
  const players = team ? data.players.filter((player) => player.teamId === team.id) : [];
  const matches = team
    ? data.matches.filter(
        (match) => match.homeTeamId === team.id || match.awayTeamId === team.id
      )
    : [];

  return {
    delegateTeams,
    team,
    event,
    players,
    matches
  };
}
