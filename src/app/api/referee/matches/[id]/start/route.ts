import { NextResponse } from "next/server";
import { requireAssignedRefereeMatch } from "@/lib/referee-access";
import { routeError } from "@/lib/server-access";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAssignedRefereeMatch(id);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    if (access.match.status !== "scheduled") {
      return NextResponse.json({ ok: false, error: "Solo se puede iniciar un partido programado." }, { status: 409 });
    }

    const { error } = await access.supabase
      .from("matches")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true, status: "in_progress" });
  } catch (error) {
    return routeError(error, "No se pudo iniciar el partido.");
  }
}
