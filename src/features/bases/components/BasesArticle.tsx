import type { TournamentBases, TournamentEvent } from "@/lib/types";
import { Card, SectionHeader } from "@/components/ui";
import { OfficialPdfButton } from "./OfficialPdfButton";

const fallbackSections = [
  "Participantes",
  "Sistema de competencia",
  "Duracion de partidos",
  "Puntuacion",
  "Desempates",
  "W.O.",
  "Sanciones",
  "Reclamos",
  "Premiacion"
];

export function BasesArticle({
  event,
  bases
}: {
  event: TournamentEvent;
  bases: TournamentBases | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-brand-towerMid/20 p-5">
        <SectionHeader
          eyebrow="Bases oficiales"
          title="Reglamento estructurado"
          description={`Campeonato seleccionado: ${event.name}`}
          action={<OfficialPdfButton />}
        />
      </div>
      <article className="grid gap-4 p-5 lg:grid-cols-2">
        {createSections(event, bases).map((section) => (
          <section key={section.title} className="rounded-md border border-brand-towerMid/25 bg-white p-4 shadow-insetLine">
            <h3 className="font-bold text-ink">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-brand-muted">{section.body}</p>
          </section>
        ))}
      </article>
    </Card>
  );
}

function createSections(event: TournamentEvent, bases: TournamentBases | null) {
  if (!bases) {
    return fallbackSections.map((title) => ({
      title,
      body: "Pendiente de publicacion por administracion."
    }));
  }

  return [
    {
      title: "Participantes",
      body: `Cada equipo puede registrar entre ${event.minPlayers} y ${event.maxPlayers} jugadores. ${bases.description}`
    },
    {
      title: "Sistema de competencia",
      body: event.rulesSummary || "Formato configurable desde administracion."
    },
    {
      title: "Duracion de partidos",
      body: `${bases.matchDuration} minutos por partido.`
    },
    {
      title: "Puntuacion",
      body: `Victoria: ${bases.pointsWin} puntos. Empate: ${bases.pointsDraw}. Derrota: ${bases.pointsLoss}.`
    },
    {
      title: "Desempates",
      body: bases.tiebreakerRules
    },
    {
      title: "W.O.",
      body: bases.walkoverRules
    },
    {
      title: "Sanciones",
      body: bases.sanctions
    },
    {
      title: "Reclamos",
      body: "Los reclamos se presentan ante mesa dentro del plazo definido por la organizacion."
    },
    {
      title: "Premiacion",
      body: "La premiacion se publicara con el fixture final y las bases oficiales."
    }
  ];
}
