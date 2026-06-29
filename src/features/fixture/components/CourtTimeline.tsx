"use client";

import type { Match, Team, TournamentEvent } from "@/lib/types";
import type { ScheduleConflict } from "@/lib/domain/conflict-detector";
import { MatchCard } from "./MatchCard";

export function CourtTimeline({
  court,
  matches,
  events,
  teams,
  conflicts,
  onOpenTeam,
  onOpenMatch
}: {
  court: string;
  matches: Match[];
  events: TournamentEvent[];
  teams: Team[];
  conflicts: ScheduleConflict[];
  onOpenTeam?: (team: Team) => void;
  onOpenMatch?: (match: Match) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-field" />
        <h3 className="font-bold text-ink">{court}</h3>
        <span className="text-xs text-ink/45">{matches.length} partidos</span>
      </div>
      <div className="grid gap-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            event={events.find((event) => event.id === match.eventId)}
            teams={teams}
            conflicts={conflicts.filter((conflict) => conflict.matchId === match.id)}
            onOpenTeam={onOpenTeam}
            onOpenMatch={onOpenMatch}
          />
        ))}
      </div>
    </section>
  );
}
