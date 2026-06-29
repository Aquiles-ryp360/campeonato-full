import type { Match, Team, TournamentEvent } from "@/lib/types";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { MatchCard } from "@/features/fixture/components/MatchCard";

export function DelegateMatchesView({
  event,
  team,
  teams,
  matches
}: {
  event: TournamentEvent;
  team: Team;
  teams: Team[];
  matches: Match[];
}) {
  const next = matches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  const previous = matches.filter((match) => match.status === "finished");
  const scheduled = matches.filter((match) => match.status !== "finished");

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Proximo partido destacado"
          description={team.name}
          action={
            event.fixtureStatus === "draft_auto" || event.fixtureStatus === "draft_review" ? (
              <Badge tone="amber">Fixture preliminar, puede cambiar</Badge>
            ) : null
          }
        />
        <div className="mt-4">
          {next ? (
            <MatchCard match={next} event={event} teams={teams} />
          ) : (
            <p className="text-sm text-ink/55">Sin proximo partido programado.</p>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Partidos programados" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {scheduled.map((match) => (
            <MatchCard key={match.id} match={match} event={event} teams={teams} />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Resultados anteriores" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {previous.length > 0 ? (
            previous.map((match) => (
              <MatchCard key={match.id} match={match} event={event} teams={teams} />
            ))
          ) : (
            <p className="text-sm text-ink/55">Todavia no hay resultados anteriores.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
