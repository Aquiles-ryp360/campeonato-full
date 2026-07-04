import { NextResponse } from "next/server";
import { liveStatusLabel } from "@/lib/live-match";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { getMatchSideLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pendingStatuses = new Set(["referee_submitted", "submitted", "under_review", "disputed"]);

export async function GET() {
  try {
    await requireAdminUser(createSupabaseAdminClient());
    const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
    const matches = data.matches
      .filter((match) => pendingStatuses.has(match.liveStatus ?? "scheduled"))
      .map((match) => {
        const event = data.events.find((item) => item.id === match.eventId) ?? null;
        const teams = data.teams.filter((team) => team.eventId === match.eventId);

        return {
          ...match,
          event,
          homeTeamName: getMatchSideLabel(match, teams, "home"),
          awayTeamName: getMatchSideLabel(match, teams, "away"),
          reviewStatusLabel: liveStatusLabel(match.liveStatus, match.status)
        };
      });

    return NextResponse.json({
      count: matches.length,
      matches
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar resultados pendientes.";
    const status = error instanceof ServerAccessError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
