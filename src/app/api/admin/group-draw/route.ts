import { NextResponse } from "next/server";
import { z } from "zod";
import {
  mapEvent,
  mapMatch,
  mapTeam,
  mapVenue,
  type EventRow,
  type MatchRow,
  type TeamRow,
  type VenueRow
} from "@/lib/data-mappers";
import { isExhibitionMatch } from "@/lib/domain/fixture-preview";
import {
  buildGroupKnockoutMatches,
  buildGroupStageMatches,
  defaultGroupCount,
  drawGroups,
  supportsGroupKnockout
} from "@/lib/domain/group-draw";
import { generateOneDaySchedule } from "@/lib/domain/schedule-generator";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";
import type { Match, TournamentEvent, Venue } from "@/lib/types";

export const runtime = "nodejs";

const drawSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato."),
  groupCount: z.coerce.number().int().min(2).max(8).optional(),
  // "approved": solo aprobados; "active": tambien inscritos y observados.
  teamScope: z.enum(["approved", "active"]).default("approved")
});

export async function POST(request: Request) {
  try {
    const input = drawSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);
    const { event, teams, matches, venues } = await loadData(admin, input.eventId);
    const fixtureStatus = event.fixtureStatus ?? "draft_auto";

    if (event.format !== "groups_then_knockout") {
      return jsonError("El sorteo de grupos es solo para campeonatos de grupos + eliminacion.", 409);
    }
    if (fixtureStatus === "published" || fixtureStatus === "locked") {
      return jsonError("El fixture ya esta publicado o bloqueado. No se puede volver a sortear.", 409);
    }
    if (hasStartedMatches(matches)) {
      return jsonError("Ya hay partidos iniciados o con resultado. No se puede volver a sortear.", 409);
    }

    const allowed = input.teamScope === "approved" ? ["approved"] : ["registered", "observed", "approved"];
    const drawTeams = teams.filter((team) => allowed.includes(team.status));
    const groupCount = input.groupCount ?? defaultGroupCount(drawTeams.length);

    if (drawTeams.length < groupCount * 2) {
      return jsonError(
        `Hay ${drawTeams.length} equipos ${input.teamScope === "approved" ? "aprobados" : "activos"}; se necesitan al menos ${groupCount * 2} para ${groupCount} grupos.`,
        409
      );
    }
    if (!supportsGroupKnockout(groupCount)) {
      return jsonError("La llave automatica soporta 2, 4 o 5 grupos.", 409);
    }

    const groups = drawGroups(drawTeams.map((team) => team.id), groupCount);
    const groupMatches = buildGroupStageMatches(event.id, groups);
    const lastGroupRound = Math.max(...groupMatches.map((match) => match.round));
    const knockoutMatches = buildGroupKnockoutMatches({
      eventId: event.id,
      groupCount,
      firstRound: lastGroupRound + 1,
      thirdPlace: event.thirdPlace ?? true
    });

    const schedule = generateOneDaySchedule([...groupMatches, ...knockoutMatches], {
      eventDate: event.eventDate ?? new Date().toISOString(),
      startTime: event.scheduleConfig?.startTime ?? "08:00",
      matchDurationMinutes: event.scheduleConfig?.matchDurationMinutes ?? 20,
      transitionMinutes: event.scheduleConfig?.transitionMinutes ?? 5,
      courts: normalizedCourts(event, venues),
      minimumRestMinutes: event.minimumRestMinutes,
      respectRoundDependencies: true,
      allowCompactPreview: event.fixtureCompactPreview ?? true
    });

    const groupIds = new Map(groups.map((group) => [group.letter, crypto.randomUUID()]));
    const matchIds = new Map(schedule.matches.map((match) => [match.id, crypto.randomUUID()]));
    const rows = schedule.matches.map((match) =>
      matchToRow(remapMatchIds(match, matchIds), groupIds, venues, fixtureStatus)
    );

    await replaceFixture(admin, {
      eventId: event.id,
      obsoleteMatchIds: matches.filter((match) => !isExhibitionMatch(match)).map((match) => match.id),
      groups: groups.map((group) => ({
        id: groupIds.get(group.letter)!,
        name: group.name,
        teamIds: group.teamIds
      })),
      rows
    });

    const teamName = new Map(teams.map((team) => [team.id, team.name]));
    return NextResponse.json({
      ok: true,
      matchCount: rows.length,
      groups: groups.map((group) => ({
        name: group.name,
        teams: group.teamIds.map((id) => teamName.get(id) ?? id)
      }))
    });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof z.ZodError) {
      return jsonError(error.errors[0]?.message ?? "Datos invalidos.", 400);
    }

    console.error("Group draw error", error);
    return jsonError("No se pudo realizar el sorteo.", 500);
  }
}

async function loadData(admin: AdminClient, eventId: string) {
  const [eventResponse, teamsResponse, matchesResponse, venuesResponse] = await Promise.all([
    admin
      .from("events")
      .select("*, sport:sport_id (name), format:format_id (key)")
      .eq("id", eventId)
      .maybeSingle<EventRow>(),
    admin.from("teams").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    admin.from("matches").select("*, venue:venue_id (id, name)").eq("event_id", eventId),
    admin.from("venues").select("*").order("name", { ascending: true })
  ]);

  if (eventResponse.error) throw new ServerAccessError(eventResponse.error.message, 500);
  if (teamsResponse.error) throw new ServerAccessError(teamsResponse.error.message, 500);
  if (matchesResponse.error) throw new ServerAccessError(matchesResponse.error.message, 500);
  if (venuesResponse.error) throw new ServerAccessError(venuesResponse.error.message, 500);
  if (!eventResponse.data) throw new ServerAccessError("Campeonato no encontrado.", 404);

  return {
    event: mapEvent(eventResponse.data),
    teams: ((teamsResponse.data ?? []) as TeamRow[]).map(mapTeam),
    matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
    venues: ((venuesResponse.data ?? []) as VenueRow[]).map(mapVenue)
  };
}

function hasStartedMatches(matches: Match[]) {
  return matches.some((match) => {
    const status = match.liveStatus ?? "scheduled";
    return (
      match.status !== "scheduled" ||
      !["scheduled", "cancelled"].includes(status) ||
      match.homeScore !== undefined ||
      match.awayScore !== undefined ||
      Boolean(match.winnerTeamId)
    );
  });
}

function remapMatchIds(match: Match, idMap: Map<string, string>): Match {
  const remap = (value?: string) => (value ? idMap.get(value) ?? value : undefined);

  return {
    ...match,
    id: idMap.get(match.id) ?? match.id,
    nextMatchId: remap(match.nextMatchId),
    homeSourceMatchId: remap(match.homeSourceMatchId),
    awaySourceMatchId: remap(match.awaySourceMatchId),
    sourceMatchIds: match.sourceMatchIds?.map((id) => idMap.get(id) ?? id),
    dependsOnMatchIds: match.dependsOnMatchIds?.map((id) => idMap.get(id) ?? id)
  };
}

function matchToRow(
  match: Match,
  groupIds: Map<string, string>,
  venues: Venue[],
  fixtureStatus: NonNullable<TournamentEvent["fixtureStatus"]>
) {
  const venue = venues.find((item) => item.name === match.court);

  return {
    id: match.id,
    event_id: match.eventId,
    group_id: match.groupId ? groupIds.get(match.groupId) ?? null : null,
    round: match.round,
    stage: match.stage,
    bracket_position: match.bracketPosition ?? null,
    next_match_id: match.nextMatchId ?? null,
    label: match.label ?? null,
    home_team_id: match.homeTeamId || null,
    away_team_id: match.awayTeamId || null,
    home_placeholder: match.homePlaceholder ?? null,
    away_placeholder: match.awayPlaceholder ?? null,
    home_source_match_id: match.homeSourceMatchId ?? null,
    away_source_match_id: match.awaySourceMatchId ?? null,
    source_match_ids: match.sourceMatchIds ?? [],
    depends_on_match_ids: match.dependsOnMatchIds ?? [],
    scheduled_at: match.scheduledAt,
    scheduled_end_at: match.scheduledEndAt ?? null,
    venue_id: venue?.id ?? null,
    status: "scheduled",
    live_status: "scheduled",
    fixture_status: fixtureStatus,
    is_fixture_preliminary: fixtureStatus === "draft_auto" || fixtureStatus === "draft_review",
    home_score: null,
    away_score: null,
    penalty_home_score: 0,
    penalty_away_score: 0,
    winner_team_id: null,
    win_method: null,
    notes: "Fixture generado por sorteo de grupos desde el panel admin.",
    updated_at: new Date().toISOString()
  };
}

async function replaceFixture(
  admin: AdminClient,
  {
    eventId,
    obsoleteMatchIds,
    groups,
    rows
  }: {
    eventId: string;
    obsoleteMatchIds: string[];
    groups: Array<{ id: string; name: string; teamIds: string[] }>;
    rows: ReturnType<typeof matchToRow>[];
  }
) {
  if (obsoleteMatchIds.length > 0) {
    const response = await admin.from("matches").delete().in("id", obsoleteMatchIds);
    if (response.error) throw new ServerAccessError(response.error.message, 500);
  }

  // Borrar grupos elimina en cascada group_teams y group_standings.
  const deleteGroups = await admin.from("groups").delete().eq("event_id", eventId);
  if (deleteGroups.error) throw new ServerAccessError(deleteGroups.error.message, 500);

  const insertGroups = await admin
    .from("groups")
    .insert(groups.map((group) => ({ id: group.id, event_id: eventId, name: group.name })));
  if (insertGroups.error) throw new ServerAccessError(insertGroups.error.message, 500);

  const insertGroupTeams = await admin
    .from("group_teams")
    .insert(groups.flatMap((group) => group.teamIds.map((teamId) => ({ group_id: group.id, team_id: teamId }))));
  if (insertGroupTeams.error) throw new ServerAccessError(insertGroupTeams.error.message, 500);

  const insertMatches = await admin.from("matches").insert(rows);
  if (insertMatches.error) throw new ServerAccessError(insertMatches.error.message, 500);
}

function normalizedCourts(event: TournamentEvent, venues: Venue[]) {
  const configured = event.scheduleConfig?.courts?.filter(Boolean) ?? [];
  if (configured.length > 0) return configured;

  const venueNames = venues.map((venue) => venue.name).filter(Boolean);
  return venueNames.length > 0 ? venueNames : ["Cancha A"];
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
