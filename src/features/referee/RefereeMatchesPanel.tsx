"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { Badge, Card, SectionHeader } from "@/components/ui";

type Row = {
  role: string;
  matches: {
    id: string;
    scheduled_at: string;
    status: string;
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number | null;
    away_score: number | null;
    events?: { name: string; category: string } | null;
    venues?: { name: string } | null;
  } | null;
};

export function RefereeMatchesPanel({ history = false }: { history?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/referee/matches")
      .then((response) => response.json())
      .then((payload) => setRows(payload.ok ? payload.matches : []))
      .catch(() => setRows([]));
  }, []);

  const matches = rows
    .map((row) => row.matches)
    .filter((match): match is NonNullable<Row["matches"]> => Boolean(match))
    .filter((match) => (history ? ["submitted", "validated", "finished"].includes(match.status) : !["validated", "finished"].includes(match.status)));

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title={history ? "Historial arbitral" : "Partidos asignados"}
          description={history ? "Resultados enviados y validados." : "Solo aparecen partidos asociados a tu usuario arbitral activo."}
          action={<Badge tone="blue">{matches.length} partidos</Badge>}
        />
      </div>
      <div className="grid gap-3 p-5">
        {matches.map((match) => (
          <Link key={match.id} href={`/arbitro/partidos/${match.id}`} className="rounded-md border border-ink/10 bg-white p-4 transition hover:bg-mist">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink">{match.events?.name ?? "Campeonato"}</p>
                <p className="text-sm text-ink/60">{match.events?.category} · {match.venues?.name ?? "Cancha"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone={match.status === "validated" ? "green" : match.status === "submitted" ? "amber" : "blue"}>{match.status}</Badge>
                <span className="inline-flex items-center gap-1 text-ink/60">
                  <Calendar className="h-4 w-4" />
                  {new Date(match.scheduled_at).toLocaleString("es-PE")}
                </span>
                {match.status === "validated" ? <CheckCircle2 className="h-4 w-4 text-field" /> : <Clock className="h-4 w-4 text-ink/45" />}
              </div>
            </div>
          </Link>
        ))}
        {matches.length === 0 ? <p className="text-sm text-ink/55">No hay partidos para mostrar.</p> : null}
      </div>
    </Card>
  );
}
