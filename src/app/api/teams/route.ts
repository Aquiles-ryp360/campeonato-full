import { NextResponse } from "next/server";
import { matchesChampionshipSlug } from "@/lib/domain/tournament-format";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireMemberUser, ServerAccessError } from "@/lib/server-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (hasSupabaseServerEnv()) {
    try {
      await requireMemberUser();
    } catch (error) {
      const status = error instanceof ServerAccessError ? error.status : 401;
      return NextResponse.json(
        { ok: false, error: "Disponible solo para equipos inscritos." },
        { status }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const data = await getPublicCompetitionData();
  const eventIds = matchingEventIds(searchParams, data.events);
  const hasFilters = hasEventFilters(searchParams);
  const teams = data.teams
    .filter((team) => !hasFilters || eventIds.has(team.eventId))
    .map((team) => ({
      ...team,
      event: data.events.find((event) => event.id === team.eventId) ?? null
    }));

  return NextResponse.json({
    count: teams.length,
    teams
  });
}

function hasEventFilters(searchParams: URLSearchParams) {
  return Boolean(
    searchParams.get("championship") ||
      searchParams.get("championshipId") ||
      searchParams.get("eventId") ||
      searchParams.get("sport") ||
      searchParams.get("category")
  );
}

function matchingEventIds(searchParams: URLSearchParams, events: Awaited<ReturnType<typeof getPublicCompetitionData>>["events"]) {
  const championship = searchParams.get("championship") ?? searchParams.get("championshipId") ?? searchParams.get("eventId");
  const sport = searchParams.get("sport")?.trim().toLowerCase();
  const category = searchParams.get("category")?.trim().toLowerCase();

  const filtered = events.filter((event) => {
    if (championship && !matchesChampionshipSlug(event, championship)) return false;
    if (sport && event.sport.toLowerCase() !== sport) return false;
    if (category && event.category.toLowerCase() !== category) return false;
    return true;
  });

  return new Set(filtered.map((event) => event.id));
}

function hasSupabaseServerEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
