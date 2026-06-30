import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  reason: z.string().trim().optional().default("")
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { reason } = schema.parse(await request.json().catch(() => ({})));
    const { supabase, user } = await requireRole("admin");
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("match_results")
      .update({ status: "disputed", observations: reason, updated_at: now })
      .eq("id", id)
      .select("id, match_id")
      .single();

    if (error) throw error;
    await supabase.from("matches").update({ status: "disputed", updated_at: now }).eq("id", data.match_id);
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "resultado_disputado",
      entity_table: "match_results",
      entity_id: data.id,
      payload: { matchId: data.match_id, reason }
    });
    return NextResponse.json({ ok: true, status: "disputed" });
  } catch (error) {
    return routeError(error, "No se pudo observar el resultado.");
  }
}
