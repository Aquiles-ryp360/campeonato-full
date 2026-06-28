import { getPublicCompetitionData } from "@/lib/supabase-data";
import { tournamentBases as mockBases } from "@/lib/mock-data";
import { PublicShell } from "@/components/shell";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { BookOpen, Scale, ShieldAlert, Trophy } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BasesPage() {
  const data = await getPublicCompetitionData();
  const bases = data.tournamentBases && data.tournamentBases.length > 0
    ? data.tournamentBases[0]
    : mockBases[0];

  return (
    <PublicShell>
      <div className="space-y-6 pb-20 md:pb-0">
        <section className="rounded-lg bg-ink p-5 text-white shadow-panel sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">Reglamento Oficial</Badge>
            <Badge tone="dark">Bases del Campeonato</Badge>
            <Badge tone="dark">{bases.published ? "Publicado" : "Borrador"}</Badge>
          </div>
          <div className="mt-7">
            <h1 className="text-3xl font-bold sm:text-5xl">{bases.championshipName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Bases y normas que rigen la competencia de deportes universitarios intercarreras.
            </p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-5 space-y-4 col-span-2">
            <SectionHeader
              title="Información General del Campeonato"
              description="Detalles del campeonato actual y su organización."
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-md bg-mist p-4 space-y-1">
                <p className="text-xs text-ink/55 uppercase font-bold">Organizador</p>
                <p className="text-base font-bold text-ink">{bases.organizer}</p>
              </div>
              <div className="rounded-md bg-mist p-4 space-y-1">
                <p className="text-xs text-ink/55 uppercase font-bold">Año Académico</p>
                <p className="text-base font-bold text-ink">{bases.year}</p>
              </div>
              <div className="rounded-md bg-mist p-4 space-y-1">
                <p className="text-xs text-ink/55 uppercase font-bold">Fecha de Inicio</p>
                <p className="text-base font-bold text-ink">{formatDateTime(bases.startDate)}</p>
              </div>
              <div className="rounded-md bg-mist p-4 space-y-1">
                <p className="text-xs text-ink/55 uppercase font-bold">Fecha de Clausura</p>
                <p className="text-base font-bold text-ink">{formatDateTime(bases.endDate)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-field" />
                Descripción del Evento
              </h3>
              <p className="text-sm text-ink/75 leading-relaxed whitespace-pre-line bg-white/50 p-4 rounded border border-ink/5">
                {bases.description}
              </p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-field" />
                Reglas de Juego
              </h3>
              <div className="space-y-4 text-sm">
                <div className="border-b border-ink/5 pb-3">
                  <p className="font-bold text-ink">Duración base de partidos</p>
                  <p className="text-ink/65">{bases.matchDuration} minutos por partido.</p>
                </div>
                <div className="border-b border-ink/5 pb-3">
                  <p className="font-bold text-ink">Máximo de jugadores por equipo</p>
                  <p className="text-ink/65">{bases.maxPlayersPerTeam} jugadores inscritos.</p>
                </div>
                <div className="border-b border-ink/5 pb-3">
                  <p className="font-bold text-ink">Sistema de puntuación</p>
                  <p className="text-ink/65">
                    Victoria: <span className="font-bold text-field">+{bases.pointsWin} pts</span><br />
                    Empate: <span className="font-bold text-ink/60">+{bases.pointsDraw} pts</span><br />
                    Derrota: <span className="font-bold text-red-600">+{bases.pointsLoss} pts</span>
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-coral" />
                Sanciones y W.O.
              </h3>
              <div className="space-y-3 text-sm text-ink/75">
                <div>
                  <h4 className="font-bold text-ink">Política de W.O. (Walk Over)</h4>
                  <p className="text-xs mt-1 text-ink/65 whitespace-pre-line">
                    {bases.walkoverRules}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-ink">Sanciones Disciplinarias</h4>
                  <p className="text-xs mt-1 text-ink/65 whitespace-pre-line">
                    {bases.sanctions}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-5">
          <h3 className="text-lg font-bold text-ink mb-2 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-field" />
            Criterios de Desempate
          </h3>
          <p className="text-sm text-ink/75 leading-relaxed">
            En caso de igualdad de puntos en la tabla de posiciones, se aplicarán los siguientes criterios en orden descendente:
          </p>
          <div className="mt-3 bg-mist p-4 rounded-md text-sm font-semibold text-ink/80 whitespace-pre-line">
            {bases.tiebreakerRules}
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}
