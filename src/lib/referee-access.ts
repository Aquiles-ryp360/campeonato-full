import "server-only";

import { requireRole } from "./server-access";

export async function requireAssignedRefereeMatch(matchId: string) {
  const { supabase, user } = await requireRole("referee");
  const { data: referee } = await supabase
    .from("referees")
    .select("id, active")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; active: boolean }>();

  if (!referee?.active) {
    return { ok: false as const, status: 403, error: "Arbitro inactivo o no asociado." };
  }

  const { data } = await supabase
    .from("match_referees")
    .select("matches(*)")
    .eq("referee_id", referee.id)
    .eq("match_id", matchId)
    .maybeSingle<{ matches: Record<string, unknown> | Record<string, unknown>[] | null }>();

  const match = Array.isArray(data?.matches) ? data.matches[0] : data?.matches;
  if (!match) {
    return { ok: false as const, status: 403, error: "Este partido no esta asignado al arbitro." };
  }

  return { ok: true as const, supabase, user, refereeId: referee.id, match };
}
