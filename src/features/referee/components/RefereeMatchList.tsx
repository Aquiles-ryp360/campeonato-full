import { CalendarClock, MapPin, PlayCircle, Trophy } from "lucide-react";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import type { RefereeDashboardData } from "@/lib/queries/referee";
import type { Team } from "@/lib/types";
import { formatDateTime, formatLabel, getMatchSideLabel } from "@/lib/utils";

export function RefereeMatchList({ data }: { data: RefereeDashboardData }) {
  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Arbitraje"
        title="Mis partidos"
        description="Partidos asignados a tu correo, ordenados por fecha, hora, campeonato y categoria."
        action={data.userEmail ? <Badge tone={data.isAdmin ? "amber" : "green"}>{data.userEmail}</Badge> : null}
      />

      {data.matches.length > 0 ? (
        <div className="grid gap-3">
          {data.matches.map(({ match, event, homeTeam, awayTeam, assignment }) => {
            const matchTeams = [homeTeam, awayTeam].filter(Boolean) as Team[];

            return (
              <Card key={match.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={liveBadgeTone(match.liveStatus)}>{liveStatusLabel(match.liveStatus)}</Badge>
                      {event ? <Badge tone="neutral">{formatLabel(event.format)}</Badge> : null}
                      {data.isAdmin && assignment ? (
                        <Badge tone="amber">{assignment.refereeEmail}</Badge>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-xl font-black text-ink">
                      {getMatchSideLabel(match, matchTeams, "home")} vs{" "}
                      {getMatchSideLabel(match, matchTeams, "away")}
                    </h2>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-ink/62 sm:grid-cols-2 lg:grid-cols-4">
                      <span className="inline-flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        {event?.name ?? "Campeonato"}
                      </span>
                      <span>{event?.category ?? "Categoria"}</span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {match.court}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        {formatDateTime(match.scheduledAt)}
                      </span>
                    </div>
                  </div>

                  <Button href={`/arbitro/partidos/${match.id}/live`} className="w-full lg:w-auto">
                    <PlayCircle className="h-4 w-4" />
                    Partido en vivo
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-lg font-bold text-ink">No hay partidos asignados.</p>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Si ya deberias arbitrar, pide al admin que asigne tu correo en el fixture.
          </p>
        </Card>
      )}
    </div>
  );
}

function liveStatusLabel(status = "scheduled") {
  const labels: Record<string, string> = {
    scheduled: "Programado",
    in_progress_first_half: "Primer tiempo",
    halftime: "Descanso",
    in_progress_second_half: "Segundo tiempo",
    pending_tiebreak: "Definir desempate",
    penalties: "Penales",
    submitted: "En evaluacion",
    validated: "Validado",
    under_review: "En evaluacion",
    disputed: "Observado",
    cancelled: "Cancelado"
  };

  return labels[status] ?? "Programado";
}

function liveBadgeTone(status = "scheduled"): "green" | "amber" | "red" | "blue" {
  if (status === "submitted" || status === "under_review") return "amber";
  if (status === "validated") return "green";
  if (status === "cancelled" || status === "disputed") return "red";
  if (status === "scheduled") return "blue";
  return "green";
}
