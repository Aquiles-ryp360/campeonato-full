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
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import {
  buildFixtureTeamFingerprint,
  exhibitionMatchesForSchedule,
  isExhibitionMatch
} from "@/lib/domain/fixture-preview";
import { generateOneDaySchedule } from "@/lib/domain/schedule-generator";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";
import type { Match, TournamentEvent, Venue } from "@/lib/types";

export const runtime = "nodejs";

const regenerateSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato.")
});

export async function POST(request: Request) {
  try {
    const input = regenerateSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const { event, teams, matches, venues } = await loadFixtureData(admin, input.eventId);
    const fixtureStatus = event.fixtureStatus ?? "draft_auto";

    if (event.format !== "single_elimination") {
      return jsonError("Solo se puede regenerar una llave de eliminacion directa.", 409);
    }

    if (fixtureStatus === "locked") {
      return jsonError("Este fixture esta bloqueado. Desbloquealo antes de regenerar.", 409);
    }

    const activeTeams = teams.filter((team) => isActiveRegistrationTeamStatus(team.status));
    if (activeTeams.length < 2) {
      return jsonError("Se necesitan al menos 2 equipos activos para generar la llave.", 409);
    }

    if (hasStartedMatches(matches)) {
      return jsonError("No se puede regenerar porque ya hay partidos iniciados o con resultado.", 409);
    }

    const seed = crypto.randomUUID();
    const teamFingerprint = buildFixtureTeamFingerprint(activeTeams);
    const bracket = generateKnockoutBracket({
      eventId: event.id,
      teams: activeTeams,
      thirdPlace: event.thirdPlace ?? true,
      maxTeams: event.maxTeams,
      allowByes: event.allowByes ?? true,
      seedingMode: "random",
      randomSeed: seed,
      fixtureStatus
    });

    if (bracket.status !== "complete" || bracket.matches.length === 0) {
      return jsonError(bracket.warnings[0] ?? "No se pudo generar una llave valida.", 409);
    }

    const exhibitionMatches = matches.filter(isExhibitionMatch);
    const schedule = generateOneDaySchedule(
      [...bracket.matches, ...exhibitionMatchesForSchedule(exhibitionMatches, bracket.matches)],
      {
        eventDate: event.eventDate ?? matches[0]?.scheduledAt ?? new Date().toISOString(),
        startTime: event.scheduleConfig?.startTime ?? "09:00",
        matchDurationMinutes: event.scheduleConfig?.matchDurationMinutes ?? 20,
        transitionMinutes: event.scheduleConfig?.transitionMinutes ?? 10,
        courts: normalizedCourts(event, venues),
        minimumRestMinutes: event.minimumRestMinutes,
        respectRoundDependencies: true,
        allowCompactPreview: event.fixtureCompactPreview ?? true
      }
    );
    const idMap = buildMatchIdMap(schedule.matches, matches);
    const remappedMatches = schedule.matches.map((match) => remapMatchIds(match, idMap));
    const rows = remappedMatches.map((match) => matchToRow(match, venues, fixtureStatus));

    await persistRegeneratedFixture(admin, {
      event,
      matches,
      rows,
      seed,
      teamFingerprint
    });

    return NextResponse.json({
      ok: true,
      matchCount: rows.length,
      preliminaryCount: bracket.preliminaryMatches,
      seed
    });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.errors[0]?.message ?? "Datos invalidos.", 400);
    }

    console.error("Fixture regenerate error", error);
    return jsonError("No se pudo regenerar el fixture.", 500);
  }
}

async function loadFixtureData(admin: AdminClient, eventId: string) {
  const [eventResponse, teamsResponse, matchesResponse, venuesResponse] = await Promise.all([
    admin
      .from("events")
      .select("*, sport:sport_id (name), format:format_id (key)")
      .eq("id", eventId)
      .maybeSingle<EventRow>(),
    admin.from("teams").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    admin
      .from("matches")
      .select("*, venue:venue_id (id, name)")
      .eq("event_id", eventId)
      .order("scheduled_at", { ascending: true }),
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
      match.winnerTeamId
    );
  });
}

function buildMatchIdMap(generatedMatches: Match[], existingMatches: Match[]) {
  const existingByIdentity = new Map(existingMatches.map((match) => [matchIdentityKey(match), match.id]));

  return new Map(
    generatedMatches.map((match) => [
      match.id,
      existingByIdentity.get(matchIdentityKey(match)) ?? crypto.randomUUID()
    ])
  );
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

function matchToRow(match: Match, venues: Venue[], fixtureStatus: NonNullable<TournamentEvent["fixtureStatus"]>) {
  const venue = venues.find((item) => item.name === match.court);

  return {
    id: match.id,
    event_id: match.eventId,
    round: match.round,
    stage: match.stage,
    bracket_position: match.bracketPosition ?? null,
    next_match_id: match.nextMatchId ?? null,
    is_home_next: match.isHomeNext ?? null,
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
    notes: isExhibitionMatch(match)
      ? match.notes ?? "Partido de exhibicion."
      : "Fixture regenerado por sorteo aleatorio desde el panel admin.",
    updated_at: new Date().toISOString()
  };
}

async function persistRegeneratedFixture(
  admin: AdminClient,
  {
    event,
    matches,
    rows,
    seed,
    teamFingerprint
  }: {
    event: TournamentEvent;
    matches: Match[];
    rows: ReturnType<typeof matchToRow>[];
    seed: string;
    teamFingerprint: string;
  }
) {
  const keepIds = new Set(rows.map((row) => row.id));
  const obsoleteMatchIds = matches
    .filter((match) => !isExhibitionMatch(match) && !keepIds.has(match.id))
    .map((match) => match.id);

  if (obsoleteMatchIds.length > 0) {
    const deleteResponse = await admin.from("matches").delete().in("id", obsoleteMatchIds);
    if (deleteResponse.error) throw new ServerAccessError(deleteResponse.error.message, 500);
  }

  const upsertResponse = await admin.from("matches").upsert(rows, { onConflict: "id" });
  if (upsertResponse.error) throw new ServerAccessError(upsertResponse.error.message, 500);

  const updateEventResponse = await admin
    .from("events")
    .update({
      seeding_mode: "random",
      schedule_config: {
        ...(event.scheduleConfig ?? {}),
        fixtureRandomSeed: seed,
        fixtureTeamFingerprint: teamFingerprint
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", event.id);

  if (updateEventResponse.error) {
    throw new ServerAccessError(updateEventResponse.error.message, 500);
  }
}

function normalizedCourts(event: TournamentEvent, venues: Venue[]) {
  const configured = event.scheduleConfig?.courts?.filter(Boolean) ?? [];
  if (configured.length > 0) return configured;

  const venueNames = venues.map((venue) => venue.name).filter(Boolean);
  return venueNames.length > 0 ? venueNames : ["Cancha A"];
}

function matchIdentityKey(match: Pick<Match, "stage" | "label" | "bracketPosition">) {
  return [match.stage, match.label ?? "", match.bracketPosition ?? ""].join(":");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
