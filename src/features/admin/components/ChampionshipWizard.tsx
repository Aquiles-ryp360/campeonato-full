"use client";

/* eslint-disable @next/next/no-img-element -- Admin-entered assets can be local paths or external URLs. */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  EventStatus,
  SeedingMode,
  SportKey,
  TournamentEvent,
  TournamentFormat
} from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase";
import {
  DEFAULT_PAYMENT_CONTACT_PHONE,
  DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL
} from "@/lib/payment-contact";
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

const defaultTransitionMinutes = 10;

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
  organizerName: string;
  careerName: string;
  careerLogoUrl: string;
  paymentQrYapeUrl: string;
  paymentQrPlinUrl: string;
  paymentContactPhone: string;
  paymentContactWhatsappUrl: string;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  startTime: string;
  courtCount: number;
  transitionMinutes: number;
  fixtureCompactPreview: boolean;
  publicLiveScores: boolean;
};

type AssetField = "careerLogoUrl" | "paymentQrYapeUrl" | "paymentQrPlinUrl";

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
  const [uploadingAsset, setUploadingAsset] = useState<AssetField | null>(null);
  const shouldStoreDraftLocally = !initialEvent;
  const draftKey = "championship-wizard:new";
  const isKnockout = draft.format === "single_elimination";
  const usesTablePoints = draft.format !== "single_elimination";
  const courts = useMemo(() => buildCourts(draft.courtCount), [draft.courtCount]);
  const estimatedMatches = useMemo(
    () => estimateMatchCount(draft.format, draft.maxTeams, draft.thirdPlace, draft.groupCount),
    [draft.format, draft.groupCount, draft.maxTeams, draft.thirdPlace]
  );
  const estimatedEndTime = useMemo(
    () => estimateEndTime(draft.startTime, estimatedMatches, draft.courtCount, draft.matchDuration, draft.transitionMinutes),
    [draft.courtCount, draft.matchDuration, draft.startTime, draft.transitionMinutes, estimatedMatches]
  );
  const fixturePreviewEvent = useMemo(
    () => eventFromDraft(draft, initialEvent, estimatedEndTime),
    [draft, estimatedEndTime, initialEvent]
  );

  useEffect(() => {
    if (!shouldStoreDraftLocally) {
      if (initialEvent?.id) {
        window.localStorage.removeItem(`championship-wizard:${initialEvent.id}`);
      }

      setDraft(draftFromEvent(initialEvent));
      setHydratedDraft(true);
      return;
    }

    const rawDraft = window.localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        setDraft(normalizeDraft({ ...draftFromEvent(initialEvent), ...JSON.parse(rawDraft) }));
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    }

    setHydratedDraft(true);
  }, [draftKey, initialEvent, shouldStoreDraftLocally]);

  useEffect(() => {
    if (!hydratedDraft || !shouldStoreDraftLocally) return;
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, draftKey, hydratedDraft, shouldStoreDraftLocally]);

  function updateDraft(next: Partial<WizardDraft>) {
    setDraft((current) => normalizeDraft({ ...current, ...next }));
  }

  async function uploadAsset(field: AssetField, file: File | null) {
    if (!file) return;

    setUploadingAsset(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", field);

      const response = await fetch("/api/admin/championship-assets", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "No se pudo subir la imagen.");
      }

      updateDraft({ [field]: payload.url } as Partial<WizardDraft>);
      toast.success("Imagen subida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingAsset(null);
    }
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
          transitionMinutes: draft.transitionMinutes,
          estimatedEndTime
        })
      });
      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "No se pudo guardar el campeonato.");
      }

      if (shouldStoreDraftLocally) {
        window.localStorage.removeItem(draftKey);
      }
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
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                step === index ? "bg-brand-navy text-white" : "bg-white text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"
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
            <div className="md:col-span-2">
              <div className="rounded-md border border-ink/10 bg-mist/60 p-4">
                <SectionHeader
                  title="Marca y pago"
                  description="Estos datos se muestran en la inscripcion publica del campeonato seleccionado."
                  action={
                    <div
                      className="h-10 w-10 rounded-md border border-ink/10"
                      style={{ background: draft.themePrimaryColor }}
                      aria-label="Color principal"
                    />
                  }
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Organizador">
                    <input className={inputClass} value={draft.organizerName} onChange={(event) => updateDraft({ organizerName: event.target.value })} placeholder="Comision deportiva" />
                  </Field>
                  <Field label="Carrera organizadora">
                    <input className={inputClass} value={draft.careerName} onChange={(event) => updateDraft({ careerName: event.target.value })} placeholder="Ingenieria Mecanica Electrica" />
                  </Field>
                  <Field label="Logo de la carrera">
                    <AssetInput
                      value={draft.careerLogoUrl}
                      placeholder="/epime-09/logo-carrera.png"
                      field="careerLogoUrl"
                      uploadingAsset={uploadingAsset}
                      onValueChange={(value) => updateDraft({ careerLogoUrl: value })}
                      onUpload={uploadAsset}
                    />
                  </Field>
                  <Field label="QR Yape">
                    <AssetInput
                      value={draft.paymentQrYapeUrl}
                      placeholder="/epime-09/qr-yape.png"
                      field="paymentQrYapeUrl"
                      uploadingAsset={uploadingAsset}
                      onValueChange={(value) => updateDraft({ paymentQrYapeUrl: value })}
                      onUpload={uploadAsset}
                    />
                  </Field>
                  <Field label="QR Plin">
                    <AssetInput
                      value={draft.paymentQrPlinUrl}
                      placeholder="Opcional"
                      field="paymentQrPlinUrl"
                      uploadingAsset={uploadingAsset}
                      onValueChange={(value) => updateDraft({ paymentQrPlinUrl: value })}
                      onUpload={uploadAsset}
                    />
                  </Field>
                  <Field label="WhatsApp encargado">
                    <input
                      className={inputClass}
                      value={draft.paymentContactPhone}
                      onChange={(event) =>
                        updateDraft({ paymentContactPhone: event.target.value })
                      }
                      placeholder={DEFAULT_PAYMENT_CONTACT_PHONE}
                    />
                  </Field>
                  <Field label="Link wa.me">
                    <input
                      className={inputClass}
                      value={draft.paymentContactWhatsappUrl}
                      onChange={(event) =>
                        updateDraft({ paymentContactWhatsappUrl: event.target.value })
                      }
                      placeholder={DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Color principal">
                      <input
                        className="h-10 w-full rounded-md border border-ink/10 bg-white p-1"
                        type="color"
                        value={draft.themePrimaryColor}
                        onChange={(event) => updateDraft({ themePrimaryColor: event.target.value })}
                      />
                    </Field>
                    <Field label="Color secundario">
                      <input
                        className="h-10 w-full rounded-md border border-ink/10 bg-white p-1"
                        type="color"
                        value={draft.themeSecondaryColor}
                        onChange={(event) => updateDraft({ themeSecondaryColor: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-4 rounded-md border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-ink/10 bg-white">
                    {draft.careerLogoUrl ? (
                      <img src={draft.careerLogoUrl} alt="" className="max-h-16 max-w-16 object-contain" />
                    ) : (
                      <span className="text-xs font-bold text-ink/40">LOGO</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase" style={{ color: draft.themePrimaryColor }}>
                      {draft.organizerName || "Organizador"}
                    </p>
                    <p className="mt-1 text-lg font-bold text-ink">{draft.name}</p>
                    <p className="text-sm text-ink/60">{draft.careerName || "Carrera organizadora"}</p>
                  </div>
                  <div className="flex h-20 w-full overflow-hidden rounded-md border border-ink/10 sm:w-32">
                    <div className="flex-1" style={{ background: draft.themePrimaryColor }} />
                    <div className="flex-1" style={{ background: draft.themeSecondaryColor }} />
                  </div>
                </div>
              </div>
            </div>
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
          transitionMinutes={draft.transitionMinutes}
          onTransitionMinutesChange={(value) => updateDraft({ transitionMinutes: value })}
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
    organizerName: event?.organizerName ?? "Comision deportiva de Ingenieria Mecanica Electrica",
    careerName: event?.careerName ?? "Ingenieria Mecanica Electrica",
    careerLogoUrl: event?.careerLogoUrl ?? "/epime-09/logo-carrera.png",
    paymentQrYapeUrl: event?.paymentQrYapeUrl ?? "/epime-09/qr-yape.png",
    paymentQrPlinUrl: event?.paymentQrPlinUrl ?? "",
    paymentContactPhone: event?.paymentContactPhone ?? DEFAULT_PAYMENT_CONTACT_PHONE,
    paymentContactWhatsappUrl:
      event?.paymentContactWhatsappUrl ?? DEFAULT_PAYMENT_CONTACT_WHATSAPP_URL,
    themePrimaryColor: event?.themePrimaryColor ?? "#28398f",
    themeSecondaryColor: event?.themeSecondaryColor ?? "#f4e84a",
    startTime: schedule?.startTime ?? "09:00",
    courtCount,
    transitionMinutes: schedule?.transitionMinutes ?? defaultTransitionMinutes,
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
    organizerName: draft.organizerName,
    careerName: draft.careerName,
    careerLogoUrl: draft.careerLogoUrl,
    paymentQrYapeUrl: draft.paymentQrYapeUrl,
    paymentQrPlinUrl: draft.paymentQrPlinUrl,
    paymentContactPhone: draft.paymentContactPhone,
    paymentContactWhatsappUrl: draft.paymentContactWhatsappUrl,
    themePrimaryColor: draft.themePrimaryColor,
    themeSecondaryColor: draft.themeSecondaryColor,
    preventCrossSportConflicts: event?.preventCrossSportConflicts ?? true,
    minimumRestMinutes: draft.matchDuration + draft.transitionMinutes,
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
      transitionMinutes: draft.transitionMinutes,
      courts: buildCourts(draft.courtCount),
      courtCount: draft.courtCount,
      minimumRestMinutes: draft.matchDuration + draft.transitionMinutes,
      allowCompactPreview: draft.fixtureCompactPreview,
      estimatedEndTime,
      branding: {
        organizerName: draft.organizerName,
        careerName: draft.careerName,
        careerLogoUrl: draft.careerLogoUrl,
        paymentQrYapeUrl: draft.paymentQrYapeUrl,
        paymentQrPlinUrl: draft.paymentQrPlinUrl,
        paymentContactPhone: draft.paymentContactPhone,
        paymentContactWhatsappUrl: draft.paymentContactWhatsappUrl,
        themePrimaryColor: draft.themePrimaryColor,
        themeSecondaryColor: draft.themeSecondaryColor
      }
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
    transitionMinutes: clampNumber(draft.transitionMinutes, 0, 60),
    walkoverMinutes: clampNumber(draft.walkoverMinutes, 0, 60),
    registrationFee: Math.max(0, Number.isFinite(draft.registrationFee) ? draft.registrationFee : 0),
    pointsWin: isKnockout ? 0 : draft.pointsWin,
    pointsDraw: isKnockout ? 0 : draft.pointsDraw,
    pointsLoss: isKnockout ? 0 : draft.pointsLoss,
    themePrimaryColor: normalizeHexColor(draft.themePrimaryColor, "#28398f"),
    themeSecondaryColor: normalizeHexColor(draft.themeSecondaryColor, "#f4e84a"),
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

function estimateEndTime(
  startTime: string,
  matches: number,
  courtCount: number,
  matchDuration: number,
  transitionMinutes: number
) {
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

function normalizeHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
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
    <div className="rounded-md border border-brand-towerMid/25 bg-brand-wash/50 px-3 py-2">
      <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function AssetInput({
  value,
  placeholder,
  field,
  uploadingAsset,
  onValueChange,
  onUpload
}: {
  value: string;
  placeholder: string;
  field: AssetField;
  uploadingAsset: AssetField | null;
  onValueChange: (value: string) => void;
  onUpload: (field: AssetField, file: File | null) => Promise<void>;
}) {
  const uploading = uploadingAsset === field;

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input
        className={inputClass}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
      />
      <label
        className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-mist ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Subiendo" : "Subir"}
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            void onUpload(field, file).finally(() => {
              event.currentTarget.value = "";
            });
          }}
        />
      </label>
    </div>
  );
}
