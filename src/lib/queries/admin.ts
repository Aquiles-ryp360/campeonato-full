import type { CompetitionData } from "../data-mappers";

export function getAdminSummary(data: CompetitionData) {
  return {
    activeEvents: data.events.filter((event) => event.status !== "finished"),
    pendingTeams: data.teams.filter((team) => team.status !== "approved"),
    finishedMatches: data.matches.filter((match) => match.status === "finished"),
    availableCodes: data.registrationCodes.filter((code) => code.status === "available")
  };
}
