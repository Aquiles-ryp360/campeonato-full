import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase } = await requireRole("admin");
    const { data, error } = await supabase
      .from("match_results")
      .select("*, matches(*, events(name, category), venues(name))")
      .in("status", ["submitted", "disputed"])
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, results: data ?? [] });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los resultados pendientes.");
  }
}
