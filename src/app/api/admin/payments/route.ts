import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase } = await requireRole("admin");
    const { data, error } = await supabase
      .from("team_payments")
      .select("*, teams(name, delegate_name, delegate_email, status, payment_status, category_id), events(name, category, sport_id)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, payments: data ?? [] });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los pagos.");
  }
}
