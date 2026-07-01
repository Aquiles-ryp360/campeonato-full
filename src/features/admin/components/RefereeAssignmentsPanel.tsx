"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Match, RefereeAssignment, Team, TournamentEvent } from "@/lib/types";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { formatDateTime, getMatchSideLabel } from "@/lib/utils";

type DraftState = Record<string, { email: string; name: string }>;

export function RefereeAssignmentsPanel({
  events,
  teams,
  matches
}: {
  events: TournamentEvent[];
  teams: Team[];
  matches: Match[];
}) {
  const [drafts, setDrafts] = useState<DraftState>({});
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [matches]
  );

  useEffect(() => {
    let mounted = true;

    async function loadAssignments() {
      try {
        const response = await fetch("/api/admin/referee-assignments", { cache: "no-store" });
        const payload = (await response.json()) as {
          assignments?: RefereeAssignment[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar los arbitros.");
        }

        if (!mounted) return;

        setDrafts(
          Object.fromEntries(
            (payload.assignments ?? []).map((assignment) => [
              assignment.matchId,
              {
                email: assignment.refereeEmail,
                name: assignment.refereeName ?? ""
              }
            ])
          )
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los arbitros.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAssignments();

    return () => {
      mounted = false;
    };
  }, []);

  function updateDraft(matchId: string, next: Partial<{ email: string; name: string }>) {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        email: current[matchId]?.email ?? "",
        name: current[matchId]?.name ?? "",
        ...next
      }
    }));
  }

  async function saveAssignment(matchId: string, clear = false) {
    const draft = drafts[matchId] ?? { email: "", name: "" };
    setSavingMatchId(matchId);

    try {
      const response = await fetch("/api/admin/referee-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          refereeEmail: clear ? "" : draft.email,
          refereeName: clear ? "" : draft.name
        })
      });
      const payload = (await response.json()) as {
        assignment?: RefereeAssignment | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el arbitro.");
      }

      if (payload.assignment) {
        updateDraft(matchId, {
          email: payload.assignment.refereeEmail,
          name: payload.assignment.refereeName ?? ""
        });
        toast.success("Arbitro asignado.");
      } else {
        updateDraft(matchId, { email: "", name: "" });
        toast.success("Asignacion limpiada.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el arbitro.");
    } finally {
      setSavingMatchId(null);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Arbitros por partido"
        description="Asigna el correo que usara cada arbitro para entrar al panel movil en vivo."
        action={<Badge tone={loading ? "amber" : "green"}>{loading ? "Cargando" : `${sortedMatches.length} partidos`}</Badge>}
      />

      <div className="mt-5 grid gap-3">
        {sortedMatches.map((match) => {
          const event = events.find((item) => item.id === match.eventId);
          const draft = drafts[match.id] ?? { email: "", name: "" };
          const saving = savingMatchId === match.id;

          return (
            <div key={match.id} className="grid gap-3 rounded-md border border-ink/10 bg-white p-4 lg:grid-cols-[1fr_240px_220px_auto] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{event?.name ?? "Campeonato"}</Badge>
                  <Badge tone={match.liveStatus && match.liveStatus !== "scheduled" ? "green" : "blue"}>
                    {liveStatusLabel(match.liveStatus)}
                  </Badge>
                </div>
                <p className="mt-2 font-bold text-ink">
                  {getMatchSideLabel(match, teams, "home")} vs {getMatchSideLabel(match, teams, "away")}
                </p>
                <p className="mt-1 text-xs font-semibold text-ink/55">
                  {event?.category ?? "Categoria"} · {match.court} · {formatDateTime(match.scheduledAt)}
                </p>
              </div>

              <Field label="Correo arbitro">
                <input
                  className={inputClass}
                  type="email"
                  value={draft.email}
                  onChange={(event) => updateDraft(match.id, { email: event.target.value })}
                  placeholder="arbitro@gmail.com"
                />
              </Field>

              <Field label="Nombre">
                <input
                  className={inputClass}
                  value={draft.name}
                  onChange={(event) => updateDraft(match.id, { name: event.target.value })}
                  placeholder="Opcional"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-[auto_auto]">
                <Button
                  onClick={() => saveAssignment(match.id)}
                  disabled={saving || !draft.email.trim()}
                  className="px-3"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "..." : "Guardar"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => saveAssignment(match.id, true)}
                  disabled={saving || !draft.email.trim()}
                  className="px-3"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && sortedMatches.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">Genera partidos antes de asignar arbitros.</p>
      ) : null}
    </Card>
  );
}

function liveStatusLabel(status: Match["liveStatus"]) {
  const labels: Record<NonNullable<Match["liveStatus"]>, string> = {
    scheduled: "Programado",
    in_progress_first_half: "Primer tiempo",
    halftime: "Descanso",
    in_progress_second_half: "Segundo tiempo",
    pending_tiebreak: "Definir desempate",
    penalties: "Penales",
    referee_submitted: "Resultado oficial",
    submitted: "Resultado oficial",
    validated: "Validado",
    under_review: "En revision",
    corrected: "Corregido",
    disputed: "Observado",
    cancelled: "Cancelado"
  };

  return labels[status ?? "scheduled"];
}
