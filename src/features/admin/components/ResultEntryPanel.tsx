"use client";

import { Save } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { getTeamName } from "@/lib/utils";

export function ResultEntryPanel({ data }: { data: CompetitionData }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader title="Resultados" description="Carga manual de marcador, W.O. o notas del partido." />
      </div>
      <div className="grid gap-4 p-5">
        {data.matches.map((match) => (
          <div key={match.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-4 md:grid-cols-[1fr_90px_90px_auto] md:items-end">
            <div>
              <p className="font-bold text-ink">
                {getTeamName(data.teams, match.homeTeamId)} vs {getTeamName(data.teams, match.awayTeamId)}
              </p>
              <p className="mt-1 text-xs text-ink/55">{match.court}</p>
            </div>
            <Field label="Local">
              <input className={inputClass} type="number" defaultValue={match.homeScore ?? 0} />
            </Field>
            <Field label="Visita">
              <input className={inputClass} type="number" defaultValue={match.awayScore ?? 0} />
            </Field>
            <Button>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        ))}
        {data.matches.length === 0 ? (
          <p className="text-sm text-ink/55">Todavia no hay partidos para registrar resultados.</p>
        ) : null}
      </div>
    </Card>
  );
}
