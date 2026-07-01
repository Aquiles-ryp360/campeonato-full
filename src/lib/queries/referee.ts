import "server-only";

import {
  mapEvent,
  mapMatch,
  mapMatchLiveEvent,
  mapPlayer,
  mapPlayerSuspension,
  mapRefereeAssignment,
  mapTeam,
  type EventRow,
  type MatchLiveEventRow,
  type MatchRow,
  type PlayerRow,
  type PlayerSuspensionRow,
  type RefereeAssignmentRow,
  type TeamRow
} from "../data-mappers";
import { getPublicCompetitionData } from "../supabase-data";
import { createSupabaseAdminClient } from "../supabase-admin";
import {
  getOptionalRouteUser,
  isAdminUser,
  requireRefereeMatchAccess
} from "../server-access";
import type {
  Match,
  MatchLiveEvent,
  Player,
  PlayerSuspension,
  RefereeAssignment,
  Team,
  TournamentEvent
} from "../types";

export type RefereeMatchItem = {
  match: Match;
  event?: TournamentEvent;
  homeTeam?: Team;
  awayTeam?: Team;
  assignment?: RefereeAssignment;
};

export type RefereeDashboardData = {
  userEmail?: string;
  isAdmin: boolean;
  matches: RefereeMatchItem[];
};

export type RefereeLiveMatchData = {
  userEmail: string;
  isAdmin: boolean;
  match: Match;
  event: TournamentEvent;
  homeTeam?: Team;
  awayTeam?: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  suspensions: PlayerSuspension[];
  events: MatchLiveEvent[];
  assignment?: RefereeAssignment;
};

export async function getRefereeDashboardData(): Promise<RefereeDashboardData> {
  const [data, user] = await Promise.all([
    getPublicCompetitionData({ includePrivatePlayerFields: false }),
    getOptionalRouteUser()
  ]);

  if (!user?.email) {
    return { isAdmin: false, matches: [] };
  }

  const admin = createSupabaseAdminClient();
  const adminUser = await isAdminUser(admin, user);
  const assignments = adminUser
    ? await getAllActiveAssignments(admin)
    : await getAssignmentsForUser(admin, user.id, user.email);
  const assignmentByMatch = new Map(assignments.map((assignment) => [assignment.matchId, assignment]));
  const allowedMatchIds = new Set(assignments.map((assignment) => assignment.matchId));
  const matches = (adminUser ? data.matches : data.matches.filter((match) => allowedMatchIds.has(match.id)))
    .sort((a, b) => {
      const eventA = data.events.find((event) => event.id === a.eventId);
      const eventB = data.events.find((event) => event.id === b.eventId);
      return (
        a.scheduledAt.localeCompare(b.scheduledAt) ||
        (eventA?.name ?? "").localeCompare(eventB?.name ?? "") ||
        (eventA?.category ?? "").localeCompare(eventB?.category ?? "")
      );
    })
    .map((match) => ({
      match,
      event: data.events.find((event) => event.id === match.eventId),
      homeTeam: data.teams.find((team) => team.id === match.homeTeamId),
      awayTeam: data.teams.find((team) => team.id === match.awayTeamId),
      assignment: assignmentByMatch.get(match.id)
    }));

  return {
    userEmail: user.email,
    isAdmin: adminUser,
    matches
  };
}

export async function getRefereeLiveMatchData(matchId: string): Promise<RefereeLiveMatchData> {
  const admin = createSupabaseAdminClient();
  const access = await requireRefereeMatchAccess(matchId, admin);
  const { data: matchRow, error: matchError } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (matchError) throw new Error(matchError.message);
  if (!matchRow) throw new Error("Partido no encontrado.");

  const match = mapMatch(matchRow);
  const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean);
  const [
    eventResponse,
    teamsResponse,
    playersResponse,
    eventsResponse,
    suspensionsResponse,
    assignmentResponse
  ] = await Promise.all([
    admin
      .from("events")
      .select("*, sport:sport_id(name), format:format_id(key)")
      .eq("id", match.eventId)
      .single<EventRow>(),
    teamIds.length
      ? admin.from("teams").select("*").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? admin.from("players").select("*").in("team_id", teamIds).order("first_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("match_live_events")
      .select("*")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true }),
    teamIds.length
      ? admin
          .from("player_suspensions")
          .select("*")
          .eq("event_id", match.eventId)
          .in("team_id", teamIds)
          .eq("active", true)
          .gt("matches_remaining", 0)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("referee_assignments")
      .select("*")
      .eq("match_id", match.id)
      .eq("active", true)
      .maybeSingle<RefereeAssignmentRow>()
  ]);

  if (eventResponse.error) throw new Error(eventResponse.error.message);
  if (teamsResponse.error) throw new Error(teamsResponse.error.message);
  if (playersResponse.error) throw new Error(playersResponse.error.message);
  if (eventsResponse.error) throw new Error(eventsResponse.error.message);
  if (suspensionsResponse.error) throw new Error(suspensionsResponse.error.message);
  if (assignmentResponse.error) throw new Error(assignmentResponse.error.message);

  const teams = ((teamsResponse.data ?? []) as TeamRow[]).map(mapTeam);
  const players = ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer);

  return {
    userEmail: access.user.email ?? "",
    isAdmin: access.isAdmin,
    match,
    event: mapEvent(eventResponse.data),
    homeTeam: teams.find((team) => team.id === match.homeTeamId),
    awayTeam: teams.find((team) => team.id === match.awayTeamId),
    homePlayers: players.filter((player) => player.teamId === match.homeTeamId),
    awayPlayers: players.filter((player) => player.teamId === match.awayTeamId),
    suspensions: ((suspensionsResponse.data ?? []) as PlayerSuspensionRow[]).map(mapPlayerSuspension),
    events: ((eventsResponse.data ?? []) as MatchLiveEventRow[]).map(mapMatchLiveEvent),
    assignment: assignmentResponse.data ? mapRefereeAssignment(assignmentResponse.data) : undefined
  };
}

async function getAllActiveAssignments(
  admin: ReturnType<typeof createSupabaseAdminClient>
) {
  const { data, error } = await admin
    .from("referee_assignments")
    .select("*")
    .eq("active", true);

  if (error) throw new Error(error.message);
  return ((data ?? []) as RefereeAssignmentRow[]).map(mapRefereeAssignment);
}

async function getAssignmentsForUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  email: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const [byEmail, byUser] = await Promise.all([
    admin
      .from("referee_assignments")
      .select("*")
      .eq("referee_email", normalizedEmail)
      .eq("active", true),
    admin
      .from("referee_assignments")
      .select("*")
      .eq("referee_user_id", userId)
      .eq("active", true)
  ]);

  if (byEmail.error) throw new Error(byEmail.error.message);
  if (byUser.error) throw new Error(byUser.error.message);

  const rows = [...((byEmail.data ?? []) as RefereeAssignmentRow[]), ...((byUser.data ?? []) as RefereeAssignmentRow[])];
  const deduped = new Map(rows.map((row) => [row.id, row]));
  return Array.from(deduped.values()).map(mapRefereeAssignment);
}
