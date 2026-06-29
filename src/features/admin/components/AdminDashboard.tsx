import { CalendarDays, CheckCircle2, CircleDollarSign, Trophy, UsersRound } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { getAdminSummary } from "@/lib/queries/admin";
import { Button, Card, Metric, SectionHeader } from "@/components/ui";
import { TeamsReviewTable } from "./TeamsReviewTable";
import { FixtureGenerationPanel } from "./FixtureGenerationPanel";
import { ResultEntryPanel } from "./ResultEntryPanel";

export function AdminDashboard({ data }: { data: CompetitionData }) {
  const summary = getAdminSummary(data);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Panel administrador"
          title="Resumen operativo"
          description="Campeonatos, inscripciones, fixture y resultados con menu reducido."
        />
        <Button href="/admin/campeonatos/nuevo">
          <Trophy className="h-4 w-4" />
          Nuevo campeonato
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Campeonatos activos" value={`${summary.activeEvents.length}`} icon={Trophy} />
        <Metric label="Inscripciones por revisar" value={`${summary.pendingTeams.length}`} icon={UsersRound} tone="amber" />
        <Metric label="Codigos disponibles" value={`${summary.availableCodes.length}`} icon={CircleDollarSign} tone="blue" />
        <Metric label="Resultados publicados" value={`${summary.finishedMatches.length}`} icon={CheckCircle2} tone="green" />
      </section>

      <Card className="p-5">
        <SectionHeader title="Campeonatos" action={<Button href="/admin/campeonatos" variant="secondary">Gestionar</Button>} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {data.events.map((event) => (
            <div key={event.id} className="rounded-md border border-ink/10 bg-white p-4">
              <p className="font-bold text-ink">{event.name}</p>
              <p className="mt-1 text-sm text-ink/55">{event.category}</p>
            </div>
          ))}
        </div>
      </Card>

      <TeamsReviewTable data={data} />
      <FixtureGenerationPanel data={data} />
      <ResultEntryPanel data={data} />

      <Card className="p-5">
        <SectionHeader
          title="Configuracion"
          description="Ajustes de roles, bases, canchas, horarios y reportes agrupados en una sola entrada."
          action={
            <Button href="/admin/configuracion" variant="secondary">
              <CalendarDays className="h-4 w-4" />
              Abrir configuracion
            </Button>
          }
        />
      </Card>
    </div>
  );
}
