import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase, user } = await requireRole("referee");
    const { data: referee, error: refereeError } = await supabase
      .from("referees")
      .select("id, active")
      .eq("user_id", user.id)
      .maybeSingle<{ id: string; active: boolean }>();

    if (refereeError || !referee?.active) {
      return NextResponse.json({ ok: false, error: "Arbitro inactivo o no asociado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("match_referees")
      .select("role, matches(*, events(name, category, sport_id), venues(name))")
      .eq("referee_id", referee.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, matches: data ?? [] });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los partidos del arbitro.");
  }
}
