"use client";

import { useMemo, useState } from "react";
import type { CompetitionData } from "@/lib/data-mappers";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { ChampionshipSwitcher } from "@/features/public/components/ChampionshipSwitcher";
import { BasesArticle } from "./BasesArticle";
import { BasesEmptyState, BasesStatusCard } from "./BasesStatusCard";

export function PublicBasesPage({
  data,
  initialChampionship
}: {
  data: CompetitionData;
  initialChampionship?: string;
}) {
  const initial = getChampionshipPublicContext(data, initialChampionship);
  const [eventId, setEventId] = useState(initial.event?.id ?? "");
  const context = useMemo(
    () => getChampionshipPublicContext(data, eventId || initialChampionship),
    [data, eventId, initialChampionship]
  );

  if (!context.event) return <BasesEmptyState />;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="rounded-lg bg-technical-blue p-5 text-white shadow-panel sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="dark">Bases oficiales</Badge>
          <Badge tone="dark">{context.bases?.published ? "Publicado" : "Pendiente"}</Badge>
        </div>
        <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-5xl">Bases oficiales</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Consulta el resumen web y descarga el PDF oficial del campeonato seleccionado.
            </p>
          </div>
          <ChampionshipSwitcher
            events={context.events}
            value={context.event.id}
            onChange={(nextEventId) => setEventId(nextEventId)}
          />
        </div>
      </section>

      <BasesStatusCard event={context.event} bases={context.bases} />
      <BasesArticle event={context.event} bases={context.bases} />

      <Card className="p-5">
        <SectionHeader
          title="PDF oficial"
          description="El archivo descargable corresponde al campeonato seleccionado: Futbol 11 o Voley Mixto."
        />
      </Card>
    </div>
  );
}
