import { NextResponse } from "next/server";
import { matchesChampionshipSlug } from "@/lib/domain/tournament-format";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { getMatchSideLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getPublicCompetitionData();
  const hasFilters = hasEventFilters(searchParams);
  const events = data.events.filter((event) => {
    const championship = searchParams.get("championship") ?? searchParams.get("championshipId") ?? searchParams.get("eventId");
    const sport = searchParams.get("sport")?.trim().toLowerCase();
    const category = searchParams.get("category")?.trim().toLowerCase();

    if (championship && !matchesChampionshipSlug(event, championship)) return false;
    if (sport && event.sport.toLowerCase() !== sport) return false;
    if (category && event.category.toLowerCase() !== category) return false;
    return true;
  });
  const eventIds = new Set(events.map((event) => event.id));
  const matches = data.matches
    .filter((match) => !hasFilters || eventIds.has(match.eventId))
    .map((match) => {
      const event = data.events.find((item) => item.id === match.eventId) ?? null;
      const teams = data.teams.filter((team) => team.eventId === match.eventId);

      return {
        ...match,
        event,
        homeTeamName: getMatchSideLabel(match, teams, "home"),
        awayTeamName: getMatchSideLabel(match, teams, "away")
      };
    });

  return NextResponse.json({
    count: matches.length,
    matches
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
