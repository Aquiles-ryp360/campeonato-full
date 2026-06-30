import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireRole("admin");
    const now = new Date().toISOString();
    const { data: result, error } = await supabase
      .from("match_results")
      .update({ status: "validated", validated_by: user.id, validated_at: now, updated_at: now })
      .eq("id", id)
      .select("id, match_id, home_score, away_score")
      .single();

    if (error) throw error;

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        status: "validated",
        home_score: result.home_score,
        away_score: result.away_score,
        updated_at: now
      })
      .eq("id", result.match_id);

    if (matchError) throw matchError;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "validacion_resultado",
      entity_table: "match_results",
      entity_id: result.id,
      payload: { matchId: result.match_id }
    });

    return NextResponse.json({ ok: true, status: "validated" });
  } catch (error) {
    return routeError(error, "No se pudo validar el resultado.");
  }
}
