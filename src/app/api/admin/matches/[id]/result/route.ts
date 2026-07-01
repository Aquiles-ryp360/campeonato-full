import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";

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
  home_score: number | null;
  away_score: number | null;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
  winner_team_id: string | null;
  referee_notes: string | null;
};

const reviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_under_review"),
    reason: z.string().trim().min(3).max(500)
  }),
  z.object({
    action: z.literal("correct_result"),
    homeScore: z.coerce.number().int().min(0),
    awayScore: z.coerce.number().int().min(0),
    penaltyHomeScore: z.coerce.number().int().min(0).optional(),
    penaltyAwayScore: z.coerce.number().int().min(0).optional(),
    winnerTeamId: z.string().uuid().optional(),
    reason: z.string().trim().min(3).max(500)
  })
]);

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: matchId } = await context.params;
    const input = reviewSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);
    const match = await getMatch(admin, matchId);

    if (input.action === "mark_under_review") {
      await markUnderReview(admin, match, user.id, input.reason);
      return NextResponse.json({ ok: true });
    }

    await correctResult(admin, match, user.id, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el resultado.";
    const status = error instanceof ServerAccessError ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

async function getMatch(admin: AdminClient, matchId: string) {
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (error) throw new Error(error.message);
  if (!data) throw new ServerAccessError("Partido no encontrado.", 404);
  return data;
}

async function markUnderReview(admin: AdminClient, match: MatchRow, userId: string, reason: string) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("matches")
    .update({
      live_status: "under_review",
      referee_notes: appendAuditNote(match.referee_notes, "En revision", reason),
      updated_at: now
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  await insertAdminObservation(admin, match, userId, `Resultado marcado en revision: ${reason}`);
}

async function correctResult(
  admin: AdminClient,
  match: MatchRow,
  userId: string,
  input: Extract<z.infer<typeof reviewSchema>, { action: "correct_result" }>
) {
  const penaltyHome = input.penaltyHomeScore ?? match.penalty_home_score ?? 0;
  const penaltyAway = input.penaltyAwayScore ?? match.penalty_away_score ?? 0;
  const winnerTeamId = resolveWinnerTeamId(match, input.homeScore, input.awayScore, penaltyHome, penaltyAway, input.winnerTeamId);
  const winMethod = winnerTeamId
    ? input.homeScore === input.awayScore && penaltyHome !== penaltyAway
      ? "penalties"
      : "regulation"
    : null;
  const now = new Date().toISOString();

  const { error } = await admin
    .from("matches")
    .update({
      status: "finished",
      live_status: "corrected",
      home_score: input.homeScore,
      away_score: input.awayScore,
      penalty_home_score: penaltyHome,
      penalty_away_score: penaltyAway,
      winner_team_id: winnerTeamId,
      win_method: winMethod,
      referee_notes: appendAuditNote(match.referee_notes, "Correccion admin", input.reason),
      updated_at: now
    })
    .eq("id", match.id);

  if (error) throw new Error(error.message);

  await reconcileWinnerProgression(admin, match, winnerTeamId);
  await insertAdminObservation(admin, match, userId, `Resultado corregido: ${input.reason}`);
}

function resolveWinnerTeamId(
  match: MatchRow,
  homeScore: number,
  awayScore: number,
  penaltyHome: number,
  penaltyAway: number,
  explicitWinnerTeamId?: string
) {
  if (explicitWinnerTeamId) {
    if (explicitWinnerTeamId !== match.home_team_id && explicitWinnerTeamId !== match.away_team_id) {
      throw new Error("El ganador corregido no pertenece al partido.");
    }
    return explicitWinnerTeamId;
  }

  if (homeScore > awayScore) return match.home_team_id;
  if (awayScore > homeScore) return match.away_team_id;
  if (penaltyHome > penaltyAway) return match.home_team_id;
  if (penaltyAway > penaltyHome) return match.away_team_id;
  return null;
}

async function reconcileWinnerProgression(admin: AdminClient, match: MatchRow, winnerTeamId: string | null) {
  if (match.next_match_id && match.is_home_next !== null) {
    const targetColumn = match.is_home_next ? "home_team_id" : "away_team_id";
    const { data: nextMatch, error: nextMatchError } = await admin
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("id", match.next_match_id)
      .maybeSingle<{ id: string; home_team_id: string | null; away_team_id: string | null }>();

    if (nextMatchError) throw new Error(nextMatchError.message);
    if (!nextMatch) return;

    const current = targetColumn === "home_team_id" ? nextMatch.home_team_id : nextMatch.away_team_id;
    const nextValue = winnerTeamId ?? (current === match.winner_team_id ? null : current);
    const { error } = await admin
      .from("matches")
      .update({ [targetColumn]: nextValue, updated_at: new Date().toISOString() })
      .eq("id", match.next_match_id);

    if (error) throw new Error(error.message);
    return;
  }

  if (match.stage === "final") {
    const { error } = await admin
      .from("events")
      .update({
        champion_team_id: winnerTeamId,
        champion_match_id: winnerTeamId ? match.id : null,
        champion_decided_at: winnerTeamId ? new Date().toISOString() : null
      })
      .eq("id", match.event_id);

    if (error) throw new Error(error.message);
  }
}

async function insertAdminObservation(admin: AdminClient, match: MatchRow, userId: string, notes: string) {
  const { error } = await admin.from("match_live_events").insert({
    match_id: match.id,
    event_type: "observation",
    period: "post_match",
    minute: 0,
    score_home: match.home_score ?? 0,
    score_away: match.away_score ?? 0,
    notes,
    created_by: userId
  });

  if (error) throw new Error(error.message);
}

function appendAuditNote(current: string | null, title: string, reason: string) {
  const stamped = `${new Date().toISOString()} - ${title}: ${reason}`;
  return current ? `${current}\n${stamped}` : stamped;
}
