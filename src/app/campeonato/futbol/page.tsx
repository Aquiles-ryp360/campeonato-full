import { PublicShell } from "@/components/shell";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { footballBases, footballEventId, footballRules } from "@/lib/football-content";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import type { Match, Team } from "@/lib/types";
import { formatDateTime, getTeamName } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, FilePenLine, GitBranch, ShieldCheck, UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FootballPage() {
  const data = await getPublicCompetitionData();
  const event =
    data.events.find((current) => current.id === footballEventId) ??
    data.events.find((current) => current.sport === "futbol");
  const teams = event ? data.teams.filter((team) => team.eventId === event.id) : [];
  const matches = event
    ? data.matches
        .filter((match) => match.eventId === event.id && match.stage !== "group_stage")
        .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
    : [];

  return (
    <PublicShell>
      <div className="space-y-6 pb-20 md:pb-0">
        <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">Futbol 11</Badge>
            <Badge tone="dark">Eliminacion directa</Badge>
            <Badge tone="dark">Sorteo admin</Badge>
          </div>
          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-5xl">{footballBases.championshipName}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
                Bases editables desde GitHub, equipos inscritos y llaves generadas por sorteo.
              </p>
            </div>
            <a
              href="https://github.com/Aquiles-ryp360/campeonato-full/edit/main/src/lib/football-content.ts"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist"
            >
              <FilePenLine className="h-4 w-4" />
              Editar bases
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Formato" value="Eliminacion directa" icon={GitBranch} />
          <StatCard label="Equipos" value={`${teams.length}/${event?.maxTeams ?? 8}`} icon={UsersRound} />
          <StatCard label="Duracion" value={`${footballBases.matchDuration} min`} icon={CalendarDays} />
          <StatCard label="Definicion" value="Penales" icon={ShieldCheck} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5">
            <SectionHeader
              title="Bases oficiales"
              description="Este contenido vive en src/lib/football-content.ts y se puede editar desde GitHub."
            />
            <div className="mt-5 space-y-4 text-sm text-ink/72">
              <p className="leading-6">{footballBases.description}</p>
              <div className="rounded-md bg-mist p-4">
                <p className="text-xs font-bold uppercase text-ink/50">Calendario</p>
                <p className="mt-1 font-semibold text-ink">
                  {formatDateTime(footballBases.startDate)} - {formatDateTime(footballBases.endDate)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {footballRules.map((rule) => (
                  <div key={rule} className="rounded-md border border-ink/10 bg-white p-3">
                    {rule}
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-coral/20 bg-coral/5 p-4">
                <p className="font-bold text-ink">Sanciones</p>
                <p className="mt-1 text-sm leading-6">{footballBases.sanctions}</p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-ink/10 p-5">
              <SectionHeader
                title="Llaves del sorteo"
                description="Cuando el admin ejecuta el sorteo, estos cruces se actualizan con los nombres de los equipos."
                action={<Badge tone={matches.length > 0 ? "green" : "amber"}>{matches.length > 0 ? "Publicado" : "Pendiente"}</Badge>}
              />
            </div>
            <div className="overflow-x-auto bg-ink p-4 text-white">
              <div className="grid min-w-[720px] gap-4 md:grid-cols-4">
                {matches.length > 0 ? (
                  matches.map((match) => (
                    <FootballMatchCard key={match.id} match={match} teams={teams} />
                  ))
                ) : (
                  <div className="rounded-md border border-white/15 p-5 text-sm text-white/65 md:col-span-4">
                    Las llaves apareceran cuando el administrador ejecute el sorteo.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        <Card className="p-5">
          <SectionHeader title="Equipos disponibles para sorteo" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {teams.map((team) => (
              <div key={team.id} className="rounded-md border border-ink/10 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-9 w-9 rounded-md border border-ink/10"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{team.name}</p>
                    <p className="truncate text-xs text-ink/55">{team.academicCareer ?? team.delegateName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink/58">{label}</p>
          <p className="mt-1 text-xl font-bold text-ink">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-md bg-field/10 text-field">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function FootballMatchCard({ match, teams }: { match: Match; teams: Team[] }) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  return (
    <div className="rounded-md border border-white/15 bg-white p-3 text-ink shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-ink/8 pb-2">
        <span className="rounded bg-ink px-2 py-1 text-[10px] font-black uppercase text-white">
          {stageLabel(match.stage)} {match.bracketPosition ?? 1}
        </span>
        <span className="text-[10px] font-bold uppercase text-ink/45">Sorteo</span>
      </div>
      <TeamLine team={homeTeam} fallback={getTeamName(teams, match.homeTeamId)} />
      <TeamLine team={awayTeam} fallback={getTeamName(teams, match.awayTeamId)} />
      <p className="mt-3 truncate text-[11px] text-ink/50">
        {formatDateTime(match.scheduledAt)} - {match.court}
      </p>
    </div>
  );
}

function TeamLine({ team, fallback }: { team?: Team; fallback: string }) {
  return (
    <div className="mb-1 flex h-9 items-center gap-2 rounded bg-mist px-2 text-sm font-semibold">
      <span
        className="h-3 w-3 shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: team?.primaryColor ?? "#cbd5e1" }}
      />
      <span className="min-w-0 truncate">{team?.name ?? fallback}</span>
    </div>
  );
}

function stageLabel(stage: Match["stage"]) {
  if (stage === "round_of_16") return "Octavos";
  if (stage === "quarter_finals") return "Cuartos";
  if (stage === "semi_finals") return "Semifinal";
  if (stage === "final") return "Final";
  return "Llave";
}
