import type { AuthSession } from "../auth";
import type { Team, TournamentEvent } from "../types";
import { isRegistrationOpen } from "./registration-rules";

export function isAdmin(user: AuthSession | null) {
  return user?.role === "admin";
}

export function isDelegateOfTeam(user: AuthSession | null, team: Team) {
  if (!user || user.role !== "delegate") return false;
  return team.delegateEmail.toLowerCase() === user.username.toLowerCase();
}

export function canEditRegistration(event: TournamentEvent, team: Team, user?: AuthSession | null) {
  if (isAdmin(user ?? null)) return true;
  if (user && !isDelegateOfTeam(user, team)) return false;
  return isRegistrationOpen(event);
}

export function canEditRoster(event: TournamentEvent, team: Team, user?: AuthSession | null) {
  return canEditRegistration(event, team, user);
}

export function canViewPrivateTeamData(user: AuthSession | null, team: Team) {
  return isAdmin(user) || isDelegateOfTeam(user, team);
}

export { isRegistrationOpen };
