import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  refereeId: z.string().uuid(),
  role: z.string().trim().optional().default("main")
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireRole("admin");
    const input = schema.parse(await request.json());
    const { data, error } = await supabase
      .from("match_referees")
      .upsert({ match_id: id, referee_id: input.refereeId, role: input.role }, { onConflict: "match_id,referee_id" })
      .select("*")
      .single();

    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "asignacion_arbitro",
      entity_table: "matches",
      entity_id: id,
      payload: { refereeId: input.refereeId, role: input.role }
    });
    return NextResponse.json({ ok: true, assignment: data });
  } catch (error) {
    return routeError(error, "No se pudo asignar el arbitro.");
  }
}
