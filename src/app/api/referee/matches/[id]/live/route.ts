import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ServerAccessError,
  requireRefereeMatchAccess,
  type AdminClient
} from "@/lib/server-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isPenaltyShootoutEvent } from "@/lib/live-match";
import type { MatchLiveEventType } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MatchRow = {
  id: string;
  event_id: string;
  stage: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  next_match_id: string | null;
  is_home_next: boolean | null;
  scheduled_at: string;
  status: "scheduled" | "finished" | "walkover" | "postponed";
  live_status: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
  actual_started_at: string | null;
  first_half_started_at: string | null;
  second_half_started_at: string | null;
};

type EventRow = {
  id: string;
  format?: { key: string | null } | Array<{ key: string | null }> | null;
  penalties_enabled?: boolean | null;
  schedule_config?: {
    matchDurationMinutes?: number;
    halfTimeMinute?: number;
    halfTimeBreakMinutes?: number;
    additionalTimeAllowedMinutes?: number;
    matchStartToleranceMinutes?: number;
    allowManualFinish?: boolean;
    autoValidateResults?: boolean;
  } | null;
};

type LiveEventRow = {
  id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: MatchLiveEventType;
  minute: number;
  penalty_order: number | null;
  created_at: string;
  corrected_at: string | null;
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start_match") }),
  z.object({ action: z.literal("finish_first_half") }),
  z.object({ action: z.literal("start_second_half") }),
  z.object({ action: z.literal("finish_match") }),
  z.object({ action: z.literal("start_penalties") }),
  z.object({ action: z.literal("finish_penalties") }),
  z.object({
    action: z.literal("record_event"),
    eventType: z.enum([
      "goal",
      "own_goal",
      "penalty_goal",
      "penalty_missed",
      "yellow_card",
      "red_card",
      "foul",
      "injury",
      "observation",
      "penalty_scored",
      "penalty_missed_tiebreak"
    ]),
    teamId: z.string().uuid().optional(),
    playerId: z.string().uuid().optional(),
    notes: z.string().trim().max(500).optional()
  }),
  z.object({
    action: z.literal("undo_last_event"),
    teamId: z.string().uuid().optional()
  }),
  z.object({ action: z.literal("undo_last_penalty") })
]);

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: matchId } = await context.params;
    const input = actionSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const access = await requireRefereeMatchAccess(matchId, admin);
    const { match, event } = await getMatchContext(admin, matchId);

    switch (input.action) {
      case "start_match":
        await startMatch(admin, match, event, access.user.id, access.isAdmin);
        break;
      case "finish_first_half":
        await changePhase(admin, match, event, "in_progress_first_half", "halftime", {
          first_half_ended_at: new Date().toISOString(),
          halftime_started_at: new Date().toISOString()
        }, "first_half_finished", access.user.id);
        break;
      case "start_second_half":
        await changePhase(admin, match, event, "halftime", "in_progress_second_half", {
          second_half_started_at: new Date().toISOString()
        }, "second_half_started", access.user.id);
        break;
      case "finish_match":
        await finishRegulation(admin, match, event, access.user.id);
        break;
      case "start_penalties":
        await startPenalties(admin, match, event, access.user.id);
        break;
      case "finish_penalties":
        await finishPenalties(admin, match, event, access.user.id);
        break;
      case "record_event":
        await recordLiveEvent(admin, match, event, {
          eventType: input.eventType,
          teamId: input.teamId,
          playerId: input.playerId,
          notes: input.notes,
          userId: access.user.id
        });
        break;
      case "undo_last_event":
        await undoLastEvent(admin, match, access.user.id, input.teamId, access.isAdmin);
        break;
      case "undo_last_penalty":
        await undoLastPenalty(admin, match, access.user.id, access.isAdmin);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el partido.";
    const status = error instanceof ServerAccessError ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

async function getMatchContext(admin: AdminClient, matchId: string) {
  const { data: match, error: matchError } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (matchError) throw new Error(matchError.message);
  if (!match) throw new ServerAccessError("Partido no encontrado.", 404);

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, penalties_enabled, schedule_config, format:format_id(key)")
    .eq("id", match.event_id)
    .single<EventRow>();

  if (eventError) throw new Error(eventError.message);

  return { match, event };
}

async function startMatch(
  admin: AdminClient,
  match: MatchRow,
  event: EventRow,
  userId: string,
  isAdmin: boolean
) {
  if (liveStatus(match) !== "scheduled") {
    throw new Error("Este partido ya fue iniciado o cerrado.");
  }

  if (!match.home_team_id || !match.away_team_id) {
    throw new Error("El partido todavia tiene equipos pendientes.");
  }

  if (!isAdmin) {
    validateStartWindow(match, event);
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("matches")
    .update({
      live_status: "in_progress_first_half",
      actual_started_at: now,
      first_half_started_at: now,
      home_score: match.home_score ?? 0,
      away_score: match.away_score ?? 0,
      updated_at: now
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  await insertLiveEvent(admin, {
    match,
    eventType: "match_started",
    period: "first_half",
    minute: 0,
    userId
  });
}

async function changePhase(
  admin: AdminClient,
  match: MatchRow,
  event: EventRow,
  expectedStatus: string,
  nextStatus: string,
  timestamps: Record<string, string>,
  eventType: MatchLiveEventType,
  userId: string
) {
  if (liveStatus(match) !== expectedStatus) {
    throw new Error("El partido no esta en el estado correcto para esa accion.");
  }

  const { error } = await admin
    .from("matches")
    .update({
      live_status: nextStatus,
      ...timestamps,
      updated_at: new Date().toISOString()
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  await insertLiveEvent(admin, {
    match,
    eventType,
    period: periodForStatus(nextStatus),
    minute: minuteFromMatch(match, nextStatus, event),
    userId
  });
}

async function finishRegulation(
  admin: AdminClient,
  match: MatchRow,
  event: EventRow,
  userId: string
) {
  if (liveStatus(match) !== "in_progress_second_half") {
    throw new Error("Solo se puede cerrar el partido desde el segundo tiempo.");
  }

  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;
  const now = new Date().toISOString();
  const tiedKnockout = homeScore === awayScore && isKnockoutMatch(match, event);

  if (tiedKnockout) {
    if (event.penalties_enabled === false) {
      throw new Error("Este cruce requiere ganador. Habilita penales o define una regla de desempate antes de enviar.");
    }

    const { error } = await admin
      .from("matches")
      .update({
        live_status: "pending_tiebreak",
        second_half_ended_at: now,
        actual_finished_at: now,
        updated_at: now
      })
      .eq("id", match.id);

    if (error) throw new Error(error.message);

    await insertLiveEvent(admin, {
      match,
      eventType: "match_finished",
      period: "post_match",
      minute: minuteFromMatch(match, "in_progress_second_half", event),
      scoreHome: homeScore,
      scoreAway: awayScore,
      userId
    });
    return;
  }

  const winnerTeamId = homeScore === awayScore
    ? null
    : homeScore > awayScore
      ? match.home_team_id
      : match.away_team_id;
  const autoValidated = autoValidateResults(event);
  const nextLiveStatus = autoValidated ? "validated" : "submitted";

  const { error } = await admin
    .from("matches")
    .update({
      status: "finished",
      live_status: nextLiveStatus,
      second_half_ended_at: now,
      actual_finished_at: now,
      submitted_at: now,
      validated_at: autoValidated ? now : null,
      winner_team_id: winnerTeamId,
      updated_at: now
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  if (autoValidated && winnerTeamId) {
    await advanceWinnerInBracket(admin, match, winnerTeamId, userId);
  }

  await insertLiveEvent(admin, {
    match,
    eventType: "result_submitted",
    period: "post_match",
    minute: minuteFromMatch(match, "in_progress_second_half", event),
    scoreHome: homeScore,
    scoreAway: awayScore,
    userId
  });
}

async function startPenalties(admin: AdminClient, match: MatchRow, event: EventRow, userId: string) {
  if (liveStatus(match) !== "pending_tiebreak") {
    throw new Error("Los penales solo se habilitan cuando el partido queda empatado y requiere ganador.");
  }

  if (!isKnockoutMatch(match, event) || event.penalties_enabled === false) {
    throw new Error("Este partido no tiene penales habilitados como desempate.");
  }

  const summary = await recalculatePenaltyScore(admin, match);
  const { error } = await admin
    .from("matches")
    .update({
      live_status: "penalties",
      penalty_home_score: summary.home,
      penalty_away_score: summary.away,
      updated_at: new Date().toISOString()
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  await insertLiveEvent(admin, {
    match,
    eventType: "penalties_started",
    period: "penalties",
    minute: minuteFromMatch(match, "penalties", event),
    scoreHome: match.home_score ?? 0,
    scoreAway: match.away_score ?? 0,
    notes: "Modo penales iniciado",
    userId
  });
}

async function finishPenalties(admin: AdminClient, match: MatchRow, event: EventRow, userId: string) {
  if (liveStatus(match) !== "penalties") {
    throw new Error("El partido no esta en modo penales.");
  }

  const summary = await recalculatePenaltyScore(admin, match);
  const penaltyHome = summary.home;
  const penaltyAway = summary.away;

  if (penaltyHome === penaltyAway) {
    throw new Error("Los penales siguen empatados. Define un ganador antes de enviar.");
  }

  const now = new Date().toISOString();
  const winnerTeamId = penaltyHome > penaltyAway ? match.home_team_id : match.away_team_id;
  const autoValidated = autoValidateResults(event);
  const nextLiveStatus = autoValidated ? "validated" : "submitted";
  const { error } = await admin
    .from("matches")
    .update({
      status: "finished",
      live_status: nextLiveStatus,
      submitted_at: now,
      validated_at: autoValidated ? now : null,
      actual_finished_at: now,
      penalty_home_score: penaltyHome,
      penalty_away_score: penaltyAway,
      winner_team_id: winnerTeamId,
      updated_at: now
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  if (autoValidated && winnerTeamId) {
    await advanceWinnerInBracket(admin, match, winnerTeamId, userId);
  }

  await insertLiveEvent(admin, {
    match,
    eventType: "penalties_finished",
    period: "post_match",
    minute: minuteFromMatch(match, "penalties", event),
    scoreHome: match.home_score ?? 0,
    scoreAway: match.away_score ?? 0,
    notes: `Penales ${penaltyHome}-${penaltyAway}`,
    userId
  });

  await insertLiveEvent(admin, {
    match,
    eventType: "result_submitted",
    period: "post_match",
    minute: minuteFromMatch(match, "penalties", event),
    scoreHome: match.home_score ?? 0,
    scoreAway: match.away_score ?? 0,
    userId
  });
}

async function recordLiveEvent(
  admin: AdminClient,
  match: MatchRow,
  event: EventRow,
  input: {
    eventType: MatchLiveEventType;
    teamId?: string;
    playerId?: string;
    notes?: string;
    userId: string;
  }
) {
  const status = liveStatus(match);
  const isPenaltyShootout = isPenaltyShootoutEvent(input.eventType);

  if (isPenaltyShootout && status !== "penalties") {
    throw new Error("Los penales solo se registran en modo penales.");
  }

  if (!isPenaltyShootout && !["in_progress_first_half", "halftime", "in_progress_second_half"].includes(status)) {
    throw new Error("Solo se pueden registrar eventos con el partido en vivo.");
  }

  if (input.eventType !== "observation" && !input.teamId) {
    throw new Error("Selecciona el equipo del evento.");
  }

  if (input.teamId && input.teamId !== match.home_team_id && input.teamId !== match.away_team_id) {
    throw new Error("El equipo no corresponde a este partido.");
  }

  const player = input.playerId ? await getPlayer(admin, input.playerId) : null;

  if (player && player.team_id !== input.teamId) {
    throw new Error("El jugador no pertenece al equipo seleccionado.");
  }

  if (player && await isPlayerSuspended(admin, player.id)) {
    throw new Error("Este jugador esta suspendido y no puede participar en este partido.");
  }

  const score = nextScore(match, input.eventType, input.teamId);
  const minute = minuteFromMatch(match, status, event);
  const period = periodForStatus(status);
  const penaltyOrder = isPenaltyShootout ? await nextPenaltyOrder(admin, match.id) : undefined;

  if (score) {
    const { error } = await admin
      .from("matches")
      .update({
        home_score: score.home,
        away_score: score.away,
        updated_at: new Date().toISOString()
      })
      .eq("id", match.id);

    if (error) throw new Error(error.message);
  }

  await insertLiveEvent(admin, {
    match,
    eventType: input.eventType,
    period,
    minute,
    teamId: input.teamId,
    playerId: input.playerId,
    jerseyNumber: player?.jersey_number ?? null,
    penaltyOrder,
    scoreHome: score?.home ?? match.home_score ?? 0,
    scoreAway: score?.away ?? match.away_score ?? 0,
    notes: input.notes,
    userId: input.userId
  });

  if (isPenaltyShootout) {
    await recalculatePenaltyScore(admin, match);
    return;
  }

  await mirrorEventToLegacyTables(admin, match, {
    eventType: input.eventType,
    teamId: input.teamId,
    playerId: input.playerId,
    minute,
    notes: input.notes
  });

  if (input.eventType === "red_card" && input.teamId && input.playerId) {
    await createRedCardSuspension(admin, match, input.teamId, input.playerId, input.userId);
  }
}

async function undoLastEvent(
  admin: AdminClient,
  match: MatchRow,
  userId: string,
  teamId?: string,
  isAdmin = false
) {
  let query = admin
    .from("match_live_events")
    .select("id, team_id, player_id, event_type, minute, penalty_order, created_at, corrected_at")
    .eq("match_id", match.id)
    .is("corrected_at", null)
    .in("event_type", [
      "goal",
      "own_goal",
      "penalty_goal",
      "penalty_missed",
      "yellow_card",
      "red_card",
      "foul",
      "injury",
      "observation"
    ])
    .order("created_at", { ascending: false })
    .limit(1);

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query.maybeSingle<LiveEventRow>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No hay eventos para anular.");

  await revertScoreForEvent(admin, match, data);
  await removeLegacyMirror(admin, match, data);

  if (data.event_type === "red_card" && data.player_id) {
    await admin
      .from("player_suspensions")
      .update({
        active: false,
        matches_remaining: 0,
        updated_at: new Date().toISOString()
      })
      .eq("source_match_id", match.id)
      .eq("player_id", data.player_id)
      .eq("active", true);
  }

  const { error: updateError } = await admin
    .from("match_live_events")
    .update({
      corrected_at: new Date().toISOString(),
      corrected_by: userId,
      correction_reason: "Anulado por el arbitro"
    })
    .eq("id", data.id);

  if (updateError) throw new Error(updateError.message);
}

async function undoLastPenalty(
  admin: AdminClient,
  match: MatchRow,
  userId: string,
  isAdmin = false
) {
  if (liveStatus(match) !== "penalties") {
    throw new Error("Solo se puede anular penales mientras el partido esta en modo penales.");
  }

  let query = admin
    .from("match_live_events")
    .select("id, team_id, player_id, event_type, minute, penalty_order, created_at, corrected_at")
    .eq("match_id", match.id)
    .is("corrected_at", null)
    .in("event_type", ["penalty_scored", "penalty_missed_tiebreak"])
    .order("penalty_order", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query.maybeSingle<LiveEventRow>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No hay penales para anular.");

  const { error: updateError } = await admin
    .from("match_live_events")
    .update({
      corrected_at: new Date().toISOString(),
      corrected_by: userId,
      correction_reason: "Penal anulado por el arbitro"
    })
    .eq("id", data.id);

  if (updateError) throw new Error(updateError.message);

  await recalculatePenaltyScore(admin, match);
}

async function nextPenaltyOrder(admin: AdminClient, matchId: string) {
  const { data, error } = await admin
    .from("match_live_events")
    .select("penalty_order")
    .eq("match_id", matchId)
    .is("corrected_at", null)
    .in("event_type", ["penalty_scored", "penalty_missed_tiebreak"]);

  if (error) throw new Error(error.message);

  const highest = (data ?? []).reduce((max, row) => {
    const order = typeof row.penalty_order === "number" ? row.penalty_order : 0;
    return Math.max(max, order);
  }, 0);

  return highest + 1;
}

async function recalculatePenaltyScore(admin: AdminClient, match: MatchRow) {
  const { data, error } = await admin
    .from("match_live_events")
    .select("team_id, event_type")
    .eq("match_id", match.id)
    .is("corrected_at", null)
    .in("event_type", ["penalty_scored", "penalty_missed_tiebreak"]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ team_id: string | null; event_type: string }>;
  const home = rows.filter((row) => row.team_id === match.home_team_id && row.event_type === "penalty_scored").length;
  const away = rows.filter((row) => row.team_id === match.away_team_id && row.event_type === "penalty_scored").length;

  const { error: updateError } = await admin
    .from("matches")
    .update({
      penalty_home_score: home,
      penalty_away_score: away,
      updated_at: new Date().toISOString()
    })
    .eq("id", match.id);

  if (updateError) throw new Error(updateError.message);
  return { home, away };
}

async function advanceWinnerInBracket(
  admin: AdminClient,
  match: MatchRow,
  winnerTeamId: string,
  userId: string
) {
  if (!match.next_match_id || match.is_home_next === null) return;

  const targetColumn = match.is_home_next ? "home_team_id" : "away_team_id";
  const { error } = await admin
    .from("matches")
    .update({
      [targetColumn]: winnerTeamId,
      updated_at: new Date().toISOString()
    })
    .eq("id", match.next_match_id);

  if (error) throw new Error(error.message);

  await insertLiveEvent(admin, {
    match,
    eventType: "bracket_updated",
    period: "post_match",
    minute: 0,
    notes: `Ganador enviado a ${match.next_match_id}`,
    userId
  });
}

function validateStartWindow(match: MatchRow, event: EventRow) {
  const scheduled = new Date(match.scheduled_at);
  const now = new Date();
  const tolerance = event.schedule_config?.matchStartToleranceMinutes ?? 15;
  const start = scheduled.getTime() - tolerance * 60 * 1000;
  const end = scheduled.getTime() + tolerance * 60 * 1000;

  if (limaDateKey(scheduled) !== limaDateKey(now)) {
    throw new Error("Este partido no corresponde al dia programado.");
  }

  if (now.getTime() < start) {
    throw new Error(`Este partido aun no puede iniciarse. Esta programado para las ${formatLimaTime(scheduled)}.`);
  }

  if (now.getTime() > end) {
    throw new Error("Este partido esta fuera del horario permitido. Contacta con la organizacion.");
  }
}

function nextScore(match: MatchRow, eventType: MatchLiveEventType, teamId?: string) {
  if (!teamId || !["goal", "own_goal", "penalty_goal"].includes(eventType)) return null;

  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;

  if (eventType === "own_goal") {
    return teamId === match.home_team_id
      ? { home, away: away + 1 }
      : { home: home + 1, away };
  }

  return teamId === match.home_team_id
    ? { home: home + 1, away }
    : { home, away: away + 1 };
}

async function revertScoreForEvent(admin: AdminClient, match: MatchRow, event: LiveEventRow) {
  if (["goal", "own_goal", "penalty_goal"].includes(event.event_type) && event.team_id) {
    const ownGoal = event.event_type === "own_goal";
    const next = event.team_id === match.home_team_id
      ? ownGoal
        ? { away_score: Math.max(0, (match.away_score ?? 0) - 1) }
        : { home_score: Math.max(0, (match.home_score ?? 0) - 1) }
      : ownGoal
        ? { home_score: Math.max(0, (match.home_score ?? 0) - 1) }
        : { away_score: Math.max(0, (match.away_score ?? 0) - 1) };
    const { error } = await admin.from("matches").update(next).eq("id", match.id);
    if (error) throw new Error(error.message);
  }

  if (event.event_type === "penalty_scored" && event.team_id) {
    const next =
      event.team_id === match.home_team_id
        ? { penalty_home_score: Math.max(0, (match.penalty_home_score ?? 0) - 1) }
        : { penalty_away_score: Math.max(0, (match.penalty_away_score ?? 0) - 1) };
    const { error } = await admin.from("matches").update(next).eq("id", match.id);
    if (error) throw new Error(error.message);
  }
}

async function mirrorEventToLegacyTables(
  admin: AdminClient,
  match: MatchRow,
  event: {
    eventType: MatchLiveEventType;
    teamId?: string;
    playerId?: string;
    minute: number;
    notes?: string;
  }
) {
  if (!event.teamId) return;

  if (["goal", "penalty_goal"].includes(event.eventType)) {
    const { error } = await admin.from("match_goals").insert({
      match_id: match.id,
      team_id: event.teamId,
      player_id: event.playerId ?? null,
      minute: event.minute
    });
    if (error) throw new Error(error.message);
  }

  if (event.eventType === "yellow_card" || event.eventType === "red_card") {
    const { error } = await admin.from("match_cards").insert({
      match_id: match.id,
      team_id: event.teamId,
      player_id: event.playerId ?? null,
      type: event.eventType === "yellow_card" ? "yellow" : "red",
      minute: event.minute,
      notes: event.notes ?? null
    });
    if (error) throw new Error(error.message);
  }
}

async function removeLegacyMirror(admin: AdminClient, match: MatchRow, event: LiveEventRow) {
  if (["goal", "penalty_goal"].includes(event.event_type) && event.team_id) {
    const { data } = await admin
      .from("match_goals")
      .select("id")
      .eq("match_id", match.id)
      .eq("team_id", event.team_id)
      .eq("minute", event.minute)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (data) await admin.from("match_goals").delete().eq("id", data.id);
  }

  if ((event.event_type === "yellow_card" || event.event_type === "red_card") && event.team_id) {
    const { data } = await admin
      .from("match_cards")
      .select("id")
      .eq("match_id", match.id)
      .eq("team_id", event.team_id)
      .eq("type", event.event_type === "yellow_card" ? "yellow" : "red")
      .eq("minute", event.minute)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (data) await admin.from("match_cards").delete().eq("id", data.id);
  }
}

async function insertLiveEvent(
  admin: AdminClient,
  input: {
    match: MatchRow;
    eventType: MatchLiveEventType;
    period: string;
    minute: number;
    teamId?: string;
    playerId?: string;
    jerseyNumber?: number | null;
    penaltyOrder?: number;
    scoreHome?: number;
    scoreAway?: number;
    notes?: string;
    userId: string;
  }
) {
  const { error } = await admin.from("match_live_events").insert({
    match_id: input.match.id,
    team_id: input.teamId ?? null,
    player_id: input.playerId ?? null,
    jersey_number: input.jerseyNumber ?? null,
    event_type: input.eventType,
    period: input.period,
    minute: input.minute,
    score_home: input.scoreHome ?? null,
    score_away: input.scoreAway ?? null,
    penalty_order: input.penaltyOrder ?? null,
    notes: input.notes ?? null,
    created_by: input.userId
  });

  if (error) throw new Error(error.message);
}

async function getPlayer(admin: AdminClient, playerId: string) {
  const { data, error } = await admin
    .from("players")
    .select("id, team_id, jersey_number")
    .eq("id", playerId)
    .maybeSingle<{ id: string; team_id: string; jersey_number: number | null }>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Jugador no encontrado.");
  return data;
}

async function isPlayerSuspended(admin: AdminClient, playerId: string) {
  const { data, error } = await admin
    .from("player_suspensions")
    .select("id")
    .eq("player_id", playerId)
    .eq("active", true)
    .gt("matches_remaining", 0)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function createRedCardSuspension(
  admin: AdminClient,
  match: MatchRow,
  teamId: string,
  playerId: string,
  userId: string
) {
  const { error } = await admin.from("player_suspensions").insert({
    event_id: match.event_id,
    team_id: teamId,
    player_id: playerId,
    source_match_id: match.id,
    reason: "Tarjeta roja",
    matches_remaining: 1,
    active: true,
    created_by: userId
  });

  if (error) throw new Error(error.message);
}

function minuteFromMatch(match: MatchRow, status: string, event?: EventRow) {
  const now = Date.now();
  const firstHalf = configuredFirstHalfMinute(event);
  const matchDuration = event?.schedule_config?.matchDurationMinutes ?? firstHalf * 2;

  if (status === "in_progress_first_half") {
    return elapsedMinutes(match.first_half_started_at ?? match.actual_started_at, now);
  }

  if (status === "in_progress_second_half") {
    return firstHalf + elapsedMinutes(match.second_half_started_at, now);
  }

  if (status === "halftime") return firstHalf;
  if (status === "penalties") return matchDuration;
  return 0;
}

function elapsedMinutes(value: string | null, now: number) {
  if (!value) return 0;
  return Math.max(1, Math.ceil((now - new Date(value).getTime()) / 60000));
}

function periodForStatus(status: string) {
  if (status === "in_progress_first_half") return "first_half";
  if (status === "halftime") return "halftime";
  if (status === "in_progress_second_half") return "second_half";
  if (status === "penalties") return "penalties";
  return "post_match";
}

function liveStatus(match: MatchRow) {
  return match.live_status ?? "scheduled";
}

function configuredFirstHalfMinute(event?: EventRow) {
  const total = event?.schedule_config?.matchDurationMinutes ?? 90;
  return event?.schedule_config?.halfTimeMinute ?? Math.max(1, Math.floor(total / 2));
}

function eventFormat(event: EventRow) {
  const value = Array.isArray(event.format) ? event.format[0]?.key : event.format?.key;
  if (value === "single_elimination" || value === "groups_then_knockout" || value === "league") {
    return value;
  }
  return "league";
}

function isKnockoutMatch(match: MatchRow, event: EventRow) {
  const format = eventFormat(event);
  if (format === "single_elimination") return true;
  return Boolean(format === "groups_then_knockout" && match.stage && match.stage !== "group_stage");
}

function autoValidateResults(event: EventRow) {
  return event.schedule_config?.autoValidateResults === true;
}

function limaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatLimaTime(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
