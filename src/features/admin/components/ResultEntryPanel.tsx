"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { getTeamName } from "@/lib/utils";

type ResultRow = {
  id: string;
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "submitted" | "validated" | "disputed";
  observations: string | null;
};

export function ResultEntryPanel({ data }: { data: CompetitionData }) {
  const [results, setResults] = useState<ResultRow[]>([]);

  useEffect(() => {
    void loadPending();
  }, []);

  async function loadPending() {
    const response = await fetch("/api/admin/results/pending");
    const payload = (await response.json().catch(() => null)) as { ok: true; results: ResultRow[] } | null;
    setResults(payload?.ok ? payload.results : []);
  }

  async function act(id: string, action: "validate" | "dispute") {
    const body = action === "dispute" ? { reason: window.prompt("Motivo de observacion") ?? "" } : {};
    const response = await fetch(`/api/admin/results/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      toast.error(payload?.error ?? "No se pudo actualizar el resultado.");
      return;
    }
    toast.success("Resultado actualizado.");
    await loadPending();
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Resultados"
          description="Revision de resultados enviados por arbitros antes de hacerlos oficiales."
          action={<Badge tone="amber">{results.length} pendientes</Badge>}
        />
      </div>
      <div className="grid gap-4 p-5">
        {results.map((result) => {
          const match = data.matches.find((item) => item.id === result.match_id);
          return (
          <div key={result.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-bold text-ink">
                {getTeamName(data.teams, match?.homeTeamId ?? "")} {result.home_score ?? 0} - {result.away_score ?? 0} {getTeamName(data.teams, match?.awayTeamId ?? "")}
              </p>
              <p className="mt-1 text-xs text-ink/55">{match?.court} · {result.observations}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void act(result.id, "validate")}>
                <CheckCircle2 className="h-4 w-4" />
                Validar
              </Button>
              <Button variant="secondary" onClick={() => void act(result.id, "dispute")}>
                <XCircle className="h-4 w-4" />
                Observar
              </Button>
            </div>
          </div>
          );
        })}
        {results.length === 0 ? (
          <p className="text-sm text-ink/55">No hay resultados pendientes de validacion.</p>
        ) : null}
      </div>
    </Card>
  );
}
