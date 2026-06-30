import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  reason: z.string().trim().min(1, "Indica el motivo del rechazo.")
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, profile } = await requireRole("admin");
    const input = schema.parse(await request.json());
    const reviewedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("team_payments")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
        rejection_reason: input.reason,
        updated_at: reviewedAt
      })
      .eq("id", id)
      .select("id, team_id, event_id")
      .single();

    if (error) throw error;

    await supabase
      .from("teams")
      .update({ payment_status: "rejected", status: "observed", updated_at: reviewedAt })
      .eq("id", data.team_id);

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "rechazo_pago",
      entity_table: "team_payments",
      entity_id: data.id,
      payload: { actorRole: profile.role, teamId: data.team_id, eventId: data.event_id, reason: input.reason }
    });

    return NextResponse.json({ ok: true, paymentStatus: "rejected" });
  } catch (error) {
    return routeError(error, "No se pudo rechazar el pago.");
  }
}
