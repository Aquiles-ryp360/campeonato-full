import { NextResponse } from "next/server";
import { requireAssignedRefereeMatch } from "@/lib/referee-access";
import { routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAssignedRefereeMatch(id);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const { data: players, error: playersError } = await access.supabase
      .from("players")
      .select("id, team_id, first_name, last_name, dni, student_code")
      .in("team_id", [access.match.home_team_id, access.match.away_team_id].filter(Boolean));

    if (playersError) throw playersError;
    return NextResponse.json({ ok: true, match: access.match, players: players ?? [] });
  } catch (error) {
    return routeError(error, "No se pudo cargar el partido.");
  }
}
