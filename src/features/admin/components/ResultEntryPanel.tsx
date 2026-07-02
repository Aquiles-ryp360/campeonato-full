"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { getTeamName } from "@/lib/utils";
import { liveStatusLabel } from "@/lib/live-match";

export function ResultEntryPanel({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  async function markUnderReview(matchId: string) {
    const reason = window.prompt("Motivo de revision")?.trim();
    if (!reason) return;

    setBusyMatchId(matchId);
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_under_review", reason })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo marcar en revision.");
      toast.success("Resultado marcado en revision.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar en revision.");
    } finally {
      setBusyMatchId(null);
    }
  }

  async function correctResult(event: FormEvent<HTMLFormElement>, matchId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = window.prompt("Motivo de correccion")?.trim();
    if (!reason) return;

    setBusyMatchId(matchId);
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "correct_result",
          homeScore: form.get("homeScore"),
          awayScore: form.get("awayScore"),
          penaltyHomeScore: form.get("penaltyHomeScore") || undefined,
          penaltyAwayScore: form.get("penaltyAwayScore") || undefined,
          reason
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo corregir el resultado.");
      toast.success("Resultado corregido y publicado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo corregir el resultado.");
    } finally {
      setBusyMatchId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-brand-towerMid/20 p-5">
        <SectionHeader title="Resultados" description="Resultados oficiales cargados por arbitro y correcciones por controversia." />
      </div>
      <div className="grid gap-4 p-5">
        {data.matches.map((match) => (
          <form
            key={match.id}
            onSubmit={(event) => correctResult(event, match.id)}
            className="grid gap-3 rounded-md border border-brand-towerMid/25 bg-white p-4 shadow-insetLine transition hover:border-brand-electric/30 md:grid-cols-[1fr_90px_90px_90px_90px_auto] md:items-end"
          >
            <div>
              <p className="font-bold text-ink">
                {getTeamName(data.teams, match.homeTeamId)} vs {getTeamName(data.teams, match.awayTeamId)}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-muted">{match.court} - {liveStatusLabel(match.liveStatus, match.status)}</p>
            </div>
            <Field label="Local">
              <input name="homeScore" className={inputClass} type="number" min={0} defaultValue={match.homeScore ?? 0} />
            </Field>
            <Field label="Visita">
              <input name="awayScore" className={inputClass} type="number" min={0} defaultValue={match.awayScore ?? 0} />
            </Field>
            <Field label="Pen. L">
              <input name="penaltyHomeScore" className={inputClass} type="number" min={0} defaultValue={match.penaltyHomeScore ?? 0} />
            </Field>
            <Field label="Pen. V">
              <input name="penaltyAwayScore" className={inputClass} type="number" min={0} defaultValue={match.penaltyAwayScore ?? 0} />
            </Field>
            <div className="grid gap-2">
              <Button disabled={busyMatchId === match.id}>
                <Save className="h-4 w-4" />
                Corregir
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busyMatchId === match.id}
                onClick={() => markUnderReview(match.id)}
              >
                <AlertTriangle className="h-4 w-4" />
                Revision
              </Button>
            </div>
          </form>
        ))}
        {data.matches.length === 0 ? (
          <p className="text-sm font-semibold text-brand-muted">Todavia no hay partidos para registrar resultados.</p>
        ) : null}
      </div>
    </Card>
  );
}
