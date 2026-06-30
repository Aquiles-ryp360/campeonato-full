import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  operationCode: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional(),
  status: z.enum(["pending", "review", "approved", "rejected"]).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireRole("admin");
    const input = schema.parse(await request.json());
    const payload = {
      operation_code: input.operationCode,
      receipt_url: input.receiptUrl,
      status: input.status,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("team_payments")
      .update(payload)
      .eq("id", id)
      .select("id, team_id, status")
      .single();

    if (error) throw error;
    if (input.status) {
      await supabase.from("teams").update({ payment_status: input.status }).eq("id", data.team_id);
    }

    return NextResponse.json({ ok: true, payment: data });
  } catch (error) {
    return routeError(error, "No se pudo actualizar el pago.");
  }
}
