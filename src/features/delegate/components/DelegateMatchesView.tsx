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
  const eventTeams = teams.filter((current) => current.eventId === event.id);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader title="Equipos inscritos" description="Vista de delegados, solo lectura." />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {eventTeams.map((current) => (
            <div key={current.id} className="rounded-md border border-ink/10 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: current.primaryColor }} />
                <p className="truncate text-sm font-bold text-ink">{current.name}</p>
              </div>
              <p className="mt-1 text-xs text-ink/55">{current.academicCareer ?? current.status}</p>
            </div>
          ))}
        </div>
      </Card>
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
          {scheduled.length > 0 ? (
            scheduled.map((match) => (
              <MatchCard key={match.id} match={match} event={event} teams={teams} />
            ))
          ) : (
            <p className="text-sm text-ink/55">El administrador aun no publico las llaves.</p>
          )}
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
