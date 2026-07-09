import { addMinutes } from "date-fns";
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
import {
  buildEventFixturePreview,
  buildFixtureTeamFingerprint,
  isExhibitionMatch
} from "@/lib/domain/fixture-preview";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";
import type { Match, Team, TournamentEvent, Venue } from "@/lib/types";

export const runtime = "nodejs";

const manualFixtureSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato."),
  matches: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        round: z.number().int().positive(),
        stage: z.enum([
          "group_stage",
          "preliminary",
          "round_of_16",
          "quarter_finals",
          "semi_finals",
          "final",
          "third_place"
        ]),
        bracketPosition: z.number().int().nullable().optional(),
        label: z.string().nullable().optional(),
        nextMatchId: z.string().nullable().optional(),
        isHomeNext: z.boolean().nullable().optional(),
        homeSourceMatchId: z.string().nullable().optional(),
        awaySourceMatchId: z.string().nullable().optional(),
        sourceMatchIds: z.array(z.string()).optional(),
        dependsOnMatchIds: z.array(z.string()).optional(),
        notes: z.string().nullable().optional(),
        homeTeamId: z.string().uuid().nullable().optional(),
        awayTeamId: z.string().uuid().nullable().optional(),
        scheduledAt: z.string().trim().min(1),
        court: z.string().trim().min(1)
      })
    )
    .min(1, "No hay partidos para guardar.")
});

export async function PATCH(request: Request) {
  try {
    const input = manualFixtureSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const { event, teams, matches, venues } = await loadFixtureData(admin, input.eventId);
    const fixtureStatus = event.fixtureStatus ?? "draft_auto";

    if (event.format !== "single_elimination") {
      return jsonError("El editor manual esta disponible para eliminacion directa.", 409);
    }

    if (fixtureStatus === "locked") {
      return jsonError("Este fixture esta bloqueado. Desbloquealo antes de editar.", 409);
    }

    const activeTeams = teams.filter((team) => isActiveRegistrationTeamStatus(team.status));
    const activeTeamById = new Map(activeTeams.map((team) => [team.id, team]));
    const preview = buildEventFixturePreview({ event, teams, matches, venues });
    const draftMatches = (preview?.matches ?? matches).map((match) => ({ ...match }));
    const persistedMatchByIdentity = new Map(matches.map((match) => [matchIdentityKey(match), match]));

    for (const change of input.matches) {
      const match = resolveDraftMatch(draftMatches, change);
      const current = matches.find((item) => item.id === match?.id) ?? persistedMatchByIdentity.get(changeIdentityKey(change));

      if (!match) {
        return jsonError("Uno de los partidos ya no existe.", 404);
      }

      if (current && hasStartedMatch(current)) {
        return jsonError(`No se puede editar ${current.label ?? "un partido"} porque ya fue iniciado o tiene resultado.`, 409);
      }

      const homeTeamId = normalizeTeamId(change.homeTeamId);
      const awayTeamId = normalizeTeamId(change.awayTeamId);
      const homeTeam = homeTeamId ? activeTeamById.get(homeTeamId) : null;
      const awayTeam = awayTeamId ? activeTeamById.get(awayTeamId) : null;

      if (homeTeamId && !homeTeam) return jsonError("El equipo local no esta activo en este campeonato.", 400);
      if (awayTeamId && !awayTeam) return jsonError("El equipo visitante no esta activo en este campeonato.", 400);
      if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
        return jsonError(`${match.label ?? "Partido"} no puede tener el mismo equipo en ambos lados.`, 400);
      }

      if (!match.homeSourceMatchId) {
        match.homeTeamId = homeTeamId ?? "";
        match.homePlaceholder = homeTeam?.name ?? "Equipo por confirmar";
      }
      if (!match.awaySourceMatchId) {
        match.awayTeamId = awayTeamId ?? "";
        match.awayPlaceholder = awayTeam?.name ?? "Equipo por confirmar";
      }

      const startsAt = new Date(change.scheduledAt);
      if (Number.isNaN(startsAt.getTime())) {
        return jsonError(`Hora invalida en ${match.label ?? "partido"}.`, 400);
      }

      match.scheduledAt = startsAt.toISOString();
      match.scheduledEndAt = addMinutes(
        startsAt,
        event.scheduleConfig?.matchDurationMinutes ?? 20
      ).toISOString();
      match.court = change.court;
      match.venueId = venues.find((venue) => venue.name === change.court)?.id;
    }

    const repeatedTeam = firstRepeatedOfficialTeam(draftMatches);
    if (repeatedTeam) {
      return jsonError(`${repeatedTeam.name} aparece dos veces en la llave principal.`, 400);
    }

    const idMap = buildManualMatchIdMap(draftMatches, matches);
    const remappedMatches = draftMatches.map((match) => remapMatchIds(match, idMap));
    const rows = remappedMatches.map((match) => matchToPersistRow(match, venues, fixtureStatus));

    await persistManualFixture(admin, {
      event,
      matches,
      activeTeams,
      rows
    });

    return NextResponse.json({ ok: true, updated: rows.length });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.errors[0]?.message ?? "Datos invalidos.", 400);
    }

    console.error("Manual fixture update error", error);
    return jsonError("No se pudo guardar el editor manual.", 500);
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

type ManualFixtureChange = z.infer<typeof manualFixtureSchema>["matches"][number];

function resolveDraftMatch(matches: Match[], change: ManualFixtureChange) {
  return (
    matches.find((match) => match.id === change.id) ??
    matches.find((match) => matchIdentityKey(match) === changeIdentityKey(change))
  );
}

function matchToPersistRow(match: Match, venues: Venue[], fixtureStatus: NonNullable<TournamentEvent["fixtureStatus"]>) {
  return {
    id: match.id,
    event_id: match.eventId,
    round: match.round,
    stage: match.stage,
    bracket_position: match.bracketPosition ?? null,
    next_match_id: isUuid(match.nextMatchId) ? match.nextMatchId : null,
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
    venue_id: venues.find((venue) => venue.name === match.court)?.id ?? null,
    status: match.status ?? "scheduled",
    live_status: match.liveStatus ?? "scheduled",
    fixture_status: fixtureStatus,
    is_fixture_preliminary: fixtureStatus === "draft_auto" || fixtureStatus === "draft_review",
    notes: match.notes ?? null,
    updated_at: new Date().toISOString()
  };
}

async function persistManualFixture(
  admin: AdminClient,
  {
    event,
    matches,
    activeTeams,
    rows
  }: {
    event: TournamentEvent;
    matches: Match[];
    activeTeams: Team[];
    rows: ReturnType<typeof matchToPersistRow>[];
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
      schedule_config: {
        ...(event.scheduleConfig ?? {}),
        fixtureRandomSeed: event.scheduleConfig?.fixtureRandomSeed ?? `manual-${crypto.randomUUID()}`,
        fixtureTeamFingerprint: buildFixtureTeamFingerprint(activeTeams)
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", event.id);

  if (updateEventResponse.error) {
    throw new ServerAccessError(updateEventResponse.error.message, 500);
  }
}

function buildManualMatchIdMap(draftMatches: Match[], persistedMatches: Match[]) {
  const persistedByIdentity = new Map(persistedMatches.map((match) => [matchIdentityKey(match), match.id]));

  return new Map(
    draftMatches.map((match) => [
      match.id,
      isUuid(match.id) ? match.id : persistedByIdentity.get(matchIdentityKey(match)) ?? crypto.randomUUID()
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

function matchIdentityKey(match: Pick<Match, "stage" | "label" | "bracketPosition">) {
  return [
    match.stage,
    match.label ?? "",
    match.bracketPosition ?? ""
  ].join(":");
}

function changeIdentityKey(change: Pick<ManualFixtureChange, "stage" | "label" | "bracketPosition">) {
  return [
    change.stage,
    change.label ?? "",
    change.bracketPosition ?? ""
  ].join(":");
}

function firstRepeatedOfficialTeam(matches: Match[]) {
  const seen = new Set<string>();

  for (const match of matches.filter((item) => !isExhibitionMatch(item))) {
    for (const teamId of [editableSideTeamId(match, "home"), editableSideTeamId(match, "away")]) {
      if (!teamId) continue;
      if (seen.has(teamId)) return { id: teamId, name: teamNameFromMatch(matches, teamId) };
      seen.add(teamId);
    }
  }

  return null;
}

function editableSideTeamId(match: Match, side: "home" | "away") {
  const sourceKey = side === "home" ? "homeSourceMatchId" : "awaySourceMatchId";
  const teamKey = side === "home" ? "homeTeamId" : "awayTeamId";
  return match[sourceKey] ? "" : match[teamKey];
}

function teamNameFromMatch(matches: Match[], teamId: string) {
  for (const match of matches) {
    if (match.homeTeamId === teamId) return match.homePlaceholder ?? "Un equipo";
    if (match.awayTeamId === teamId) return match.awayPlaceholder ?? "Un equipo";
  }
  return "Un equipo";
}

function hasStartedMatch(match: Match) {
  const liveStatus = match.liveStatus ?? "scheduled";
  return (
    match.status !== "scheduled" ||
    !["scheduled", "cancelled"].includes(liveStatus) ||
    match.homeScore !== undefined ||
    match.awayScore !== undefined ||
    Boolean(match.winnerTeamId)
  );
}

function normalizeTeamId(value?: string | null) {
  return value?.trim() || null;
}

function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
