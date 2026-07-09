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
import { buildFixtureTeamFingerprint, isExhibitionMatch } from "@/lib/domain/fixture-preview";
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
        id: z.string().uuid(),
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

    const matchById = new Map(matches.map((match) => [match.id, match]));
    const activeTeams = teams.filter((team) => isActiveRegistrationTeamStatus(team.status));
    const activeTeamById = new Map(activeTeams.map((team) => [team.id, team]));
    const draftMatches = matches.map((match) => ({ ...match }));

    for (const change of input.matches) {
      const match = draftMatches.find((item) => item.id === change.id);
      const current = matchById.get(change.id);

      if (!match || !current) {
        return jsonError("Uno de los partidos ya no existe.", 404);
      }

      if (hasStartedMatch(current)) {
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

    const rows = input.matches.map((change) => {
      const match = draftMatches.find((item) => item.id === change.id);
      if (!match) throw new ServerAccessError("Partido no encontrado.", 404);
      return matchToUpdateRow(match, venues, fixtureStatus);
    });

    await persistManualFixture(admin, {
      event,
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

function matchToUpdateRow(match: Match, venues: Venue[], fixtureStatus: NonNullable<TournamentEvent["fixtureStatus"]>) {
  return {
    id: match.id,
    home_team_id: match.homeTeamId || null,
    away_team_id: match.awayTeamId || null,
    home_placeholder: match.homePlaceholder ?? null,
    away_placeholder: match.awayPlaceholder ?? null,
    scheduled_at: match.scheduledAt,
    scheduled_end_at: match.scheduledEndAt ?? null,
    venue_id: venues.find((venue) => venue.name === match.court)?.id ?? null,
    fixture_status: fixtureStatus,
    is_fixture_preliminary: fixtureStatus === "draft_auto" || fixtureStatus === "draft_review",
    updated_at: new Date().toISOString()
  };
}

async function persistManualFixture(
  admin: AdminClient,
  {
    event,
    activeTeams,
    rows
  }: {
    event: TournamentEvent;
    activeTeams: Team[];
    rows: ReturnType<typeof matchToUpdateRow>[];
  }
) {
  for (const row of rows) {
    const { id, ...update } = row;
    const response = await admin
      .from("matches")
      .update(update)
      .eq("id", id)
      .eq("event_id", event.id);

    if (response.error) throw new ServerAccessError(response.error.message, 500);
  }

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

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
