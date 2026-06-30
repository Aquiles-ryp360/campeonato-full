import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  observations: z.string().trim().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const { supabase, user } = await requireRole("admin");
    const { data: before } = await supabase.from("match_results").select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase
      .from("match_results")
      .update({
        home_score: input.homeScore,
        away_score: input.awayScore,
        observations: input.observations,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "correccion_resultado",
      entity_table: "match_results",
      entity_id: id,
      payload: { before, after: data }
    });
    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    return routeError(error, "No se pudo corregir el resultado.");
  }
}
