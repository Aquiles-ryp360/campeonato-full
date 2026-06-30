import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; refereeId: string }> }
) {
  try {
    const { id, refereeId } = await params;
    const { supabase, user } = await requireRole("admin");
    const { error } = await supabase
      .from("match_referees")
      .delete()
      .eq("match_id", id)
      .eq("referee_id", refereeId);

    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "cambio_arbitro",
      entity_table: "matches",
      entity_id: id,
      payload: { refereeId, removed: true }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error, "No se pudo quitar el arbitro.");
  }
}
