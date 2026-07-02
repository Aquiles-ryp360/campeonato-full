"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type {
  EventStatus,
  SeedingMode,
  SportKey,
  TournamentEvent,
  TournamentFormat
} from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { FormatConfigForm } from "./FormatConfigForm";
import { ScheduleConfigForm } from "./ScheduleConfigForm";
import { BasesUploadForm } from "./BasesUploadForm";
import { FixtureGenerationPanel } from "./FixtureGenerationPanel";
import type { CompetitionData } from "@/lib/data-mappers";

const steps = [
  "Datos generales",
  "Formato",
  "Reglas deportivas",
  "Canchas y horarios",
  "Bases oficiales",
  "Generar fixture"
];

const transitionMinutes = 10;

type WizardDraft = {
  id?: string;
  name: string;
  sport: SportKey;
  category: string;
  eventDate: string;
  status: EventStatus;
  registrationFee: number;
  registrationOpenUntil: string;
  rulesSummary: string;
  format: TournamentFormat;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  seedingMode: SeedingMode;
  thirdPlace: boolean;
  allowByes: boolean;
  penaltiesEnabled: boolean;
  groupCount: number;
  matchDuration: number;
  halfTimeMinute: number;
  halfTimeBreakMinutes: number;
  additionalTimeAllowedMinutes: number;
  matchStartToleranceMinutes: number;
  allowManualFinish: boolean;
  walkoverMinutes: number;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  startTime: string;
  courtCount: number;
  fixtureCompactPreview: boolean;
  publicLiveScores: boolean;
};

export function ChampionshipWizard({
  data,
  initialEvent
}: {
  data: CompetitionData;
  initialEvent?: TournamentEvent | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>(() => draftFromEvent(initialEvent));
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftKey = initialEvent?.id ? `championship-wizard:${initialEvent.id}` : "championship-wizard:new";
  const isKnockout = draft.format === "single_elimination";
  const usesTablePoints = draft.format !== "single_elimination";
  const courts = useMemo(() => buildCourts(draft.courtCount), [draft.courtCount]);
  const estimatedMatches = useMemo(
    () => estimateMatchCount(draft.format, draft.maxTeams, draft.thirdPlace, draft.groupCount),
    [draft.format, draft.groupCount, draft.maxTeams, draft.thirdPlace]
  );
  const estimatedEndTime = useMemo(
    () => estimateEndTime(draft.startTime, estimatedMatches, draft.courtCount, draft.matchDuration),
    [draft.courtCount, draft.matchDuration, draft.startTime, estimatedMatches]
  );
  const fixturePreviewEvent = useMemo(
    () => eventFromDraft(draft, initialEvent, estimatedEndTime),
    [draft, estimatedEndTime, initialEvent]
  );

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        setDraft(normalizeDraft({ ...draftFromEvent(initialEvent), ...JSON.parse(rawDraft) }));
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    }

    setHydratedDraft(true);
  }, [draftKey, initialEvent]);

  useEffect(() => {
    if (!hydratedDraft) return;
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, draftKey, hydratedDraft]);

  function updateDraft(next: Partial<WizardDraft>) {
    setDraft((current) => normalizeDraft({ ...current, ...next }));
  }

  async function saveDraft() {
    if (!hasSupabaseEnv()) {
      toast.info("Modo mock: el borrador queda guardado en este navegador.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/championships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          courts,
          transitionMinutes,
          estimatedEndTime
        })
      });
      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "No se pudo guardar el campeonato.");
      }

      window.localStorage.removeItem(draftKey);
      toast.success(draft.status === "draft" ? "Borrador guardado." : "Campeonato guardado.");
      router.refresh();
      router.push(`/admin/campeonatos/${payload.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el campeonato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Wizard"
        title={initialEvent ? "Editar campeonato" : "Crear campeonato"}
        description="Configura un campeonato multi-deporte paso a paso sin saturar una sola pantalla."
      />
      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                step === index ? "bg-ink text-white" : "bg-white text-ink/65 hover:bg-mist"
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </Card>

      {step === 0 ? (
        <Card className="p-5">
          <SectionHeader title="Datos generales" action={<Badge tone={draft.status === "draft" ? "amber" : "green"}>{statusLabel(draft.status)}</Badge>} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <input className={inputClass} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
            </Field>
            <Field label="Deporte">
              <select
                className={inputClass}
                value={draft.sport}
                onChange={(event) => {
                  const sport = event.target.value as SportKey;
                  const matchDuration = defaultDuration(sport);
                  updateDraft({
                    sport,
                    matchDuration,
                    halfTimeMinute: defaultHalfTimeMinute(matchDuration)
                  });
                }}
              >
                <option value="futsal">Futsal</option>
                <option value="futbol">Futbol</option>
                <option value="voley">Voley</option>
              </select>
            </Field>
            <Field label="Categoria / rama">
              <input className={inputClass} value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} placeholder="Varones, damas, mixto" />
            </Field>
            <Field label="Fecha del evento">
              <input className={inputClass} type="date" value={draft.eventDate} onChange={(event) => updateDraft({ eventDate: event.target.value })} />
            </Field>
            <Field label="Cierre de inscripcion">
              <input className={inputClass} type="datetime-local" value={draft.registrationOpenUntil} onChange={(event) => updateDraft({ registrationOpenUntil: event.target.value })} />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as EventStatus })}>
                <option value="draft">Borrador</option>
                <option value="registration">Inscripciones</option>
                <option value="in_progress">En curso</option>
                <option value="finished">Finalizado</option>
              </select>
            </Field>
            <Field label="Costo de inscripcion">
              <input className={inputClass} type="number" min={0} value={draft.registrationFee} onChange={(event) => updateDraft({ registrationFee: Number(event.target.value) })} />
            </Field>
            <Field label="Descripcion">
              <textarea className={`${inputClass} min-h-24 resize-y`} value={draft.rulesSummary} onChange={(event) => updateDraft({ rulesSummary: event.target.value })} />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="p-5">
          <SectionHeader title="Formato" description="Elige una sola estructura competitiva; las opciones siguientes cambian con esa eleccion." />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Formato">
              <select className={inputClass} value={draft.format} onChange={(event) => updateDraft(formatDefaults(event.target.value as TournamentFormat))}>
                <option value="league">Liga por puntos</option>
                <option value="single_elimination">Eliminacion directa</option>
                <option value="groups_then_knockout">Grupos + eliminacion</option>
              </select>
            </Field>
            <Field label="Maximo equipos">
              <input className={inputClass} type="number" min={2} value={draft.maxTeams} onChange={(event) => updateDraft({ maxTeams: Number(event.target.value) })} />
            </Field>
            <Field label="Jugadores por equipo">
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="number" min={1} value={draft.minPlayers} onChange={(event) => updateDraft({ minPlayers: Number(event.target.value) })} aria-label="Minimo jugadores" />
                <input className={inputClass} type="number" min={draft.minPlayers} value={draft.maxPlayers} onChange={(event) => updateDraft({ maxPlayers: Number(event.target.value) })} aria-label="Maximo jugadores" />
              </div>
            </Field>
          </div>
          <div className="mt-5">
            <FormatConfigForm
              format={draft.format}
              seedingMode={draft.seedingMode}
              onSeedingModeChange={(value) => updateDraft({ seedingMode: value })}
              thirdPlace={draft.thirdPlace}
              onThirdPlaceChange={(value) => updateDraft({ thirdPlace: value })}
              allowByes={draft.allowByes}
              onAllowByesChange={(value) => updateDraft({ allowByes: value })}
              groupCount={draft.groupCount}
              onGroupCountChange={(value) => updateDraft({ groupCount: value })}
              maxTeams={draft.maxTeams}
            />
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-5">
          <SectionHeader title="Reglas deportivas" description={isKnockout ? "Eliminacion directa no usa puntos por empate." : "Estos puntos alimentan tabla y posiciones."} />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Field label="Duracion partido">
              <input className={inputClass} type="number" min={5} value={draft.matchDuration} onChange={(event) => updateDraft({ matchDuration: Number(event.target.value) })} />
            </Field>
            <Field label="Medio tiempo minuto">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={Math.max(1, draft.matchDuration - 1)}
                value={draft.halfTimeMinute}
                onChange={(event) => updateDraft({ halfTimeMinute: Number(event.target.value) })}
              />
            </Field>
            <Field label="Descanso medio tiempo">
              <input className={inputClass} type="number" min={0} max={60} value={draft.halfTimeBreakMinutes} onChange={(event) => updateDraft({ halfTimeBreakMinutes: Number(event.target.value) })} />
            </Field>
            <Field label="Tiempo adicional max.">
              <input className={inputClass} type="number" min={0} max={60} value={draft.additionalTimeAllowedMinutes} onChange={(event) => updateDraft({ additionalTimeAllowedMinutes: Number(event.target.value) })} />
            </Field>
            <Field label="W.O. minutos">
              <input className={inputClass} type="number" min={0} value={draft.walkoverMinutes} onChange={(event) => updateDraft({ walkoverMinutes: Number(event.target.value) })} />
            </Field>
            <Field label="Cierre del arbitro">
              <select className={inputClass} value={draft.allowManualFinish ? "manual" : "suggested"} onChange={(event) => updateDraft({ allowManualFinish: event.target.value === "manual" })}>
                <option value="manual">Puede confirmar manual</option>
                <option value="suggested">Solo tiempo sugerido</option>
              </select>
            </Field>
            {usesTablePoints ? (
              <>
                <Field label="Puntos victoria">
                  <input className={inputClass} type="number" value={draft.pointsWin} onChange={(event) => updateDraft({ pointsWin: Number(event.target.value) })} />
                </Field>
                <Field label="Puntos empate">
                  <input className={inputClass} type="number" value={draft.pointsDraw} onChange={(event) => updateDraft({ pointsDraw: Number(event.target.value) })} />
                </Field>
                <Field label="Puntos derrota">
                  <input className={inputClass} type="number" value={draft.pointsLoss} onChange={(event) => updateDraft({ pointsLoss: Number(event.target.value) })} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Empate en llave">
                  <select className={inputClass} value={draft.penaltiesEnabled ? "penalties" : "manual"} onChange={(event) => updateDraft({ penaltiesEnabled: event.target.value === "penalties" })}>
                    <option value="penalties">Penales</option>
                    <option value="manual">Decision manual</option>
                  </select>
                </Field>
                <Info label="Puntos" value="No aplica en eliminacion directa" />
              </>
            )}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <ScheduleConfigForm
          startTime={draft.startTime}
          onStartTimeChange={(value) => updateDraft({ startTime: value })}
          courtCount={draft.courtCount}
          onCourtCountChange={(value) => updateDraft({ courtCount: value })}
          matchDuration={draft.matchDuration}
          halfTimeMinute={draft.halfTimeMinute}
          transitionMinutes={transitionMinutes}
          matchStartToleranceMinutes={draft.matchStartToleranceMinutes}
          onMatchStartToleranceMinutesChange={(value) => updateDraft({ matchStartToleranceMinutes: value })}
          fixtureCompactPreview={draft.fixtureCompactPreview}
          onFixtureCompactPreviewChange={(value) => updateDraft({ fixtureCompactPreview: value })}
          publicLiveScores={draft.publicLiveScores}
          onPublicLiveScoresChange={(value) => updateDraft({ publicLiveScores: value })}
          estimatedEndTime={estimatedEndTime}
          estimatedMatches={estimatedMatches}
        />
      ) : null}
      {step === 4 ? <BasesUploadForm /> : null}
      {step === 5 ? <FixtureGenerationPanel data={data} activeEvent={fixturePreviewEvent} /> : null}

      <div className="flex justify-end">
        <Button onClick={saveDraft} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : `Guardar ${draft.status === "draft" ? "borrador" : draft.name}`}
        </Button>
      </div>
    </div>
  );
}

function draftFromEvent(event?: TournamentEvent | null): WizardDraft {
  const eventDate = event?.eventDate ? event.eventDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const registrationOpenUntil = toDateTimeLocal(
    event?.registrationOpenUntil ?? `${eventDate}T23:59:00-05:00`
  );
  const schedule = event?.scheduleConfig;
  const courtCount = schedule?.courtCount ?? schedule?.courts?.length ?? 2;

  return normalizeDraft({
    id: event?.id,
    name: event?.name ?? "Nuevo campeonato prueba",
    sport: event?.sport ?? "futsal",
    category: event?.category ?? "Varones",
    eventDate,
    status: event?.status ?? "draft",
    registrationFee: event?.registrationFee ?? 40,
    registrationOpenUntil,
    rulesSummary: event?.rulesSummary ?? "",
    format: event?.format ?? "single_elimination",
    maxTeams: event?.maxTeams ?? 10,
    minPlayers: event?.minPlayers ?? 5,
    maxPlayers: event?.maxPlayers ?? 12,
    seedingMode: event?.seedingMode ?? "registration_order",
    thirdPlace: event?.thirdPlace ?? true,
    allowByes: event?.allowByes ?? true,
    penaltiesEnabled: event?.penaltiesEnabled ?? true,
    groupCount: 2,
    matchDuration: schedule?.matchDurationMinutes ?? defaultDuration(event?.sport ?? "futsal"),
    halfTimeMinute: schedule?.halfTimeMinute ?? defaultHalfTimeMinute(schedule?.matchDurationMinutes ?? defaultDuration(event?.sport ?? "futsal")),
    halfTimeBreakMinutes: schedule?.halfTimeBreakMinutes ?? 10,
    additionalTimeAllowedMinutes: schedule?.additionalTimeAllowedMinutes ?? 0,
    matchStartToleranceMinutes: schedule?.matchStartToleranceMinutes ?? 15,
    allowManualFinish: schedule?.allowManualFinish ?? true,
    walkoverMinutes: 10,
    pointsWin: event?.pointsWin ?? 3,
    pointsDraw: event?.pointsDraw ?? 1,
    pointsLoss: event?.pointsLoss ?? 0,
    startTime: schedule?.startTime ?? "09:00",
    courtCount,
    fixtureCompactPreview: event?.fixtureCompactPreview ?? true,
    publicLiveScores: event?.publicLiveScores ?? true
  });
}

function eventFromDraft(
  draft: WizardDraft,
  event: TournamentEvent | null | undefined,
  estimatedEndTime: string
): TournamentEvent {
  return {
    id: draft.id ?? event?.id ?? "draft-preview",
    name: draft.name,
    sportId: event?.sportId ?? sportIdFromKey(draft.sport),
    sport: draft.sport,
    category: draft.category,
    formatId: event?.formatId ?? formatIdFromKey(draft.format),
    format: draft.format,
    status: draft.status,
    registrationFee: draft.registrationFee,
    registrationOpenUntil: draft.registrationOpenUntil,
    maxTeams: draft.maxTeams,
    minPlayers: draft.minPlayers,
    maxPlayers: draft.maxPlayers,
    pointsWin: draft.pointsWin,
    pointsDraw: draft.pointsDraw,
    pointsLoss: draft.pointsLoss,
    rulesSummary: draft.rulesSummary,
    preventCrossSportConflicts: event?.preventCrossSportConflicts ?? true,
    minimumRestMinutes: draft.matchDuration + transitionMinutes,
    eventDate: draft.eventDate,
    fixtureStatus: event?.fixtureStatus ?? "draft_auto",
    seedingMode: draft.seedingMode,
    thirdPlace: draft.thirdPlace,
    allowByes: draft.allowByes,
    penaltiesEnabled: draft.penaltiesEnabled,
    publicLiveScores: draft.publicLiveScores,
    championTeamId: event?.championTeamId,
    championMatchId: event?.championMatchId,
    championDecidedAt: event?.championDecidedAt,
    fixtureCompactPreview: draft.fixtureCompactPreview,
    scheduleConfig: {
      startTime: draft.startTime,
      matchDurationMinutes: draft.matchDuration,
      halfTimeMinute: draft.halfTimeMinute,
      halfTimeBreakMinutes: draft.halfTimeBreakMinutes,
      additionalTimeAllowedMinutes: draft.additionalTimeAllowedMinutes,
      matchStartToleranceMinutes: draft.matchStartToleranceMinutes,
      allowManualFinish: draft.allowManualFinish,
      transitionMinutes,
      courts: buildCourts(draft.courtCount),
      courtCount: draft.courtCount,
      minimumRestMinutes: draft.matchDuration + transitionMinutes,
      allowCompactPreview: draft.fixtureCompactPreview,
      estimatedEndTime
    }
  };
}

function normalizeDraft(draft: WizardDraft): WizardDraft {
  const maxTeams = clampNumber(draft.maxTeams, 2, 64);
  const minPlayers = clampNumber(draft.minPlayers, 1, 99);
  const maxPlayers = Math.max(minPlayers, clampNumber(draft.maxPlayers, minPlayers, 99));
  const isKnockout = draft.format === "single_elimination";

  return {
    ...draft,
    maxTeams,
    minPlayers,
    maxPlayers,
    courtCount: clampNumber(draft.courtCount, 1, 3),
    groupCount: clampNumber(draft.groupCount, 2, Math.max(2, Math.min(8, maxTeams))),
    matchDuration: clampNumber(draft.matchDuration, 5, 240),
    halfTimeMinute: clampNumber(draft.halfTimeMinute, 1, Math.max(1, clampNumber(draft.matchDuration, 5, 240) - 1)),
    halfTimeBreakMinutes: clampNumber(draft.halfTimeBreakMinutes, 0, 60),
    additionalTimeAllowedMinutes: clampNumber(draft.additionalTimeAllowedMinutes, 0, 60),
    matchStartToleranceMinutes: clampNumber(draft.matchStartToleranceMinutes, 0, 120),
    walkoverMinutes: clampNumber(draft.walkoverMinutes, 0, 60),
    registrationFee: Math.max(0, Number.isFinite(draft.registrationFee) ? draft.registrationFee : 0),
    pointsWin: isKnockout ? 0 : draft.pointsWin,
    pointsDraw: isKnockout ? 0 : draft.pointsDraw,
    pointsLoss: isKnockout ? 0 : draft.pointsLoss,
    penaltiesEnabled: isKnockout ? draft.penaltiesEnabled : false,
    thirdPlace: draft.format === "league" ? false : draft.thirdPlace,
    allowByes: draft.format === "league" ? false : draft.allowByes
  };
}

function formatDefaults(format: TournamentFormat): Partial<WizardDraft> {
  if (format === "single_elimination") {
    return {
      format,
      pointsWin: 0,
      pointsDraw: 0,
      pointsLoss: 0,
      thirdPlace: true,
      allowByes: true,
      penaltiesEnabled: true
    };
  }

  if (format === "league") {
    return {
      format,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      thirdPlace: false,
      allowByes: false,
      penaltiesEnabled: false
    };
  }

  return {
    format,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    thirdPlace: true,
    allowByes: true,
    penaltiesEnabled: false
  };
}

function defaultDuration(sport: SportKey) {
  if (sport === "futbol") return 90;
  if (sport === "voley") return 45;
  return 20;
}

function defaultHalfTimeMinute(matchDuration: number) {
  return Math.max(1, Math.floor(matchDuration / 2));
}

function estimateMatchCount(format: TournamentFormat, maxTeams: number, thirdPlace: boolean, groupCount: number) {
  if (format === "league") return Math.max(0, (maxTeams * (maxTeams - 1)) / 2);
  if (format === "single_elimination") return Math.max(1, maxTeams - 1) + (thirdPlace ? 1 : 0);

  const groupStageMatches = Math.max(0, groupCount * ((Math.ceil(maxTeams / groupCount) * (Math.ceil(maxTeams / groupCount) - 1)) / 2));
  const knockoutMatches = Math.max(3, groupCount * 2 - 1) + (thirdPlace ? 1 : 0);
  return Math.ceil(groupStageMatches + knockoutMatches);
}

function estimateEndTime(startTime: string, matches: number, courtCount: number, matchDuration: number) {
  const [hour = 9, minute = 0] = startTime.split(":").map(Number);
  const waves = Math.max(1, Math.ceil(matches / Math.max(1, courtCount)));
  const totalMinutes = waves * matchDuration + Math.max(0, waves - 1) * transitionMinutes;
  const start = new Date();
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

function buildCourts(count: number) {
  return Array.from({ length: clampNumber(count, 1, 3) }, (_, index) => `Cancha ${String.fromCharCode(65 + index)}`);
}

function sportIdFromKey(sport: SportKey) {
  return `sport-${sport}`;
}

function formatIdFromKey(format: TournamentFormat) {
  if (format === "single_elimination") return "format-knockout";
  if (format === "groups_then_knockout") return "format-groups";
  return "format-league";
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(status: EventStatus) {
  const labels: Record<EventStatus, string> = {
    draft: "Borrador",
    registration: "Inscripciones",
    in_progress: "En curso",
    finished: "Finalizado"
  };

  return labels[status];
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-mist/50 px-3 py-2">
      <p className="text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
