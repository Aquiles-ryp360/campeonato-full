import type { Team } from "../types";

export function normalizeDelegateEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

export function getTeamsForDelegateEmail(teams: Team[], delegateEmail?: string | null) {
  const normalized = normalizeDelegateEmail(delegateEmail);
  if (!normalized) return [];

  return teams.filter((team) => normalizeDelegateEmail(team.delegateEmail) === normalized);
}

export function getApprovedDelegateTeams(teams: Team[], delegateEmail?: string | null) {
  return getTeamsForDelegateEmail(teams, delegateEmail).filter((team) => team.status === "approved");
}

export function getPendingDelegateTeams(teams: Team[], delegateEmail?: string | null) {
  return getTeamsForDelegateEmail(teams, delegateEmail).filter((team) => team.status !== "approved");
}

export function canAccessDelegatePanel(teams: Team[], delegateEmail?: string | null) {
  return getApprovedDelegateTeams(teams, delegateEmail).length > 0;
}
