"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import type {
  EventStatus,
  PaymentMethod,
  SeedingMode,
  SportKey,
  TournamentEvent,
  TournamentFormat
} from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase";
import { championshipSlug, tournamentFormatLabel } from "@/lib/domain/tournament-format";
import type { CompetitionData } from "@/lib/data-mappers";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { eventStatusLabel, formatMoney, sportLabel } from "@/lib/utils";

type ChampionshipDraft = {
  name: string;
  sport: SportKey;
  category: string;
  eventDate: string;
  status: EventStatus;
  description: string;
  format: TournamentFormat;
  seedingMode: SeedingMode;
  maxTeams: number;
  thirdPlace: boolean;
  allowByes: boolean;
  penaltiesEnabled: boolean;
  registrationFee: number;
  registrationOpenUntil: string;
  minPlayers: number;
  maxPlayers: number;
  paymentMethods: PaymentMethod[];
  registrationCodeBatch: number;
  requireApproval: boolean;
  matchDurationMinutes: number;
  walkoverMinutes: number;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  startTime: string;
  endTime: string;
  transitionMinutes: number;
  minimumRestMinutes: number;
  allowCompactPreview: boolean;
  courtCount: number;
  selectedCourtIds: string[];
  basesText: string;
  publishPublicPage: boolean;
  publishRegistration: boolean;
};

const sportDefaults: Record<
  SportKey,
  Pick<ChampionshipDraft, "name" | "category" | "matchDurationMinutes" | "minPlayers" | "maxPlayers" | "maxTeams">
> = {
  futbol: {
    name: "Campeonato Futbol 11 Varones",
    category: "Varones",
    matchDurationMinutes: 90,
    minPlayers: 11,
    maxPlayers: 18,
    maxTeams: 10
  },
  futsal: {
    name: "Campeonato Futsal Varones",
    category: "Varones",
    matchDurationMinutes: 40,
    minPlayers: 8,
    maxPlayers: 12,
    maxTeams: 12
  },
  voley: {
    name: "Campeonato Voley Mixto",
    category: "Mixto",
    matchDurationMinutes: 40,
    minPlayers: 6,
    maxPlayers: 10,
    maxTeams: 10
  }
};

export function ChampionshipWizard({
  data,
  initialEvent = null
}: {
  data: CompetitionData;
  initialEvent?: TournamentEvent | null;
}) {
  const router = useRouter();
  const activeVenues = useMemo(() => data.venues.filter((venue) => venue.active), [data.venues]);
  const [draft, setDraft] = useState(() => buildInitialDraft(initialEvent, activeVenues));
  const [isPublishing, setIsPublishing] = useState(false);
  const maxCourts = activeVenues.length;
  const selectedVenueNames = useMemo(
    () =>
      draft.selectedCourtIds
        .map((id) => activeVenues.find((venue) => venue.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [activeVenues, draft.selectedCourtIds]
  );
  const slug = championshipSlug({ id: initialEvent?.id ?? "nuevo", name: draft.name });
  const publishErrors = useMemo(
    () => getPublishErrors(draft, selectedVenueNames.length, maxCourts),
    [draft, maxCourts, selectedVenueNames.length]
  );
  const readyItems = useMemo(
    () => [
      {
        label: "Datos principales",
        done: Boolean(draft.name.trim() && draft.category.trim() && draft.eventDate)
      },
      {
        label: "Inscripcion",
        done:
          draft.minPlayers > 0 &&
          draft.maxPlayers >= draft.minPlayers &&
          draft.registrationOpenUntil.length > 0 &&
          (!draft.publishRegistration || draft.paymentMethods.length > 0)
      },
      {
        label: "Canchas y horario",
        done: maxCourts > 0 && selectedVenueNames.length === draft.courtCount && minutesBetween(draft.startTime, draft.endTime) > 0
      },
      {
        label: "Publicacion",
        done: draft.publishPublicPage || draft.publishRegistration
      }
    ],
    [draft, maxCourts, selectedVenueNames.length]
  );
  const estimatedSlots = useMemo(() => {
    const availableMinutes = minutesBetween(draft.startTime, draft.endTime);
    const blockMinutes = Math.max(draft.matchDurationMinutes + draft.transitionMinutes, 1);

    return Math.floor(availableMinutes / blockMinutes) * Math.max(draft.courtCount, 0);
  }, [draft.courtCount, draft.endTime, draft.matchDurationMinutes, draft.startTime, draft.transitionMinutes]);
  const estimatedMatches = estimateMatchCount(draft);
  const canPublish = publishErrors.length === 0;

  useEffect(() => {
    setDraft((current) => normalizeCourtSelection(current, activeVenues));
  }, [activeVenues]);

  function updateDraft<K extends keyof ChampionshipDraft>(key: K, value: ChampionshipDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSport(nextSport: SportKey) {
    const defaults = sportDefaults[nextSport];
    setDraft((current) => ({
      ...current,
      sport: nextSport,
      name: current.name === sportDefaults[current.sport].name ? defaults.name : current.name,
      category: current.category === sportDefaults[current.sport].category ? defaults.category : current.category,
      maxTeams: defaults.maxTeams,
      minPlayers: defaults.minPlayers,
      maxPlayers: defaults.maxPlayers,
      matchDurationMinutes: defaults.matchDurationMinutes
    }));
  }

  function updateCourtCount(value: number) {
    setDraft((current) =>
      normalizeCourtSelection(
        {
          ...current,
          courtCount: maxCourts === 0 ? 0 : clamp(value, 1, maxCourts)
        },
        activeVenues
      )
    );
  }

  function updateSelectedCourt(index: number, venueId: string) {
    setDraft((current) => ({
      ...current,
      selectedCourtIds: current.selectedCourtIds.map((selectedId, selectedIndex) =>
        selectedIndex === index ? venueId : selectedId
      )
    }));
  }

  function togglePaymentMethod(method: PaymentMethod) {
    setDraft((current) => {
      const paymentMethods = current.paymentMethods.includes(method)
        ? current.paymentMethods.filter((item) => item !== method)
        : [...current.paymentMethods, method];

      return { ...current, paymentMethods };
    });
  }

  async function publishChampionship() {
    if (!canPublish) {
      toast.error(publishErrors[0]);
      return;
    }

    if (!hasSupabaseEnv()) {
      toast.info("Campeonato listo en modo preview. Configura Supabase para publicar en la base real.");
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch("/api/admin/championships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: initialEvent?.id,
          name: draft.name,
          sport: draft.sport,
          category: draft.category,
          eventDate: draft.eventDate,
          status: draft.publishRegistration ? "registration" : draft.status,
          description: draft.description,
          format: draft.format,
          seedingMode: draft.seedingMode,
          maxTeams: draft.maxTeams,
          thirdPlace: draft.thirdPlace,
          allowByes: draft.allowByes,
          penaltiesEnabled: draft.penaltiesEnabled,
          registrationFee: draft.registrationFee,
          registrationOpenUntil: draft.registrationOpenUntil,
          minPlayers: draft.minPlayers,
          maxPlayers: draft.maxPlayers,
          paymentMethods: draft.paymentMethods,
          registrationCodeBatch: draft.registrationCodeBatch,
          pointsWin: draft.pointsWin,
          pointsDraw: draft.pointsDraw,
          pointsLoss: draft.pointsLoss,
          matchDurationMinutes: draft.matchDurationMinutes,
          startTime: draft.startTime,
          endTime: draft.endTime,
          transitionMinutes: draft.transitionMinutes,
          minimumRestMinutes: draft.minimumRestMinutes,
          allowCompactPreview: draft.allowCompactPreview,
          selectedCourts: selectedVenueNames,
          basesText: draft.basesText
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; eventId: string; slug: string }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload && !payload.ok ? payload.error : "No se pudo publicar el campeonato.");
        return;
      }

      toast.success(initialEvent ? "Campeonato actualizado." : "Campeonato publicado.");
      if (!initialEvent) {
        router.push(`/admin/campeonatos/${payload.eventId}`);
      }
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor para publicar el campeonato.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Admin"
        title={initialEvent ? "Configurar campeonato" : "Crear campeonato"}
        description="Editor unico con datos, inscripcion, formato, canchas, bases y publicacion."
        action={<Badge tone={canPublish ? "green" : "amber"}>{canPublish ? "Listo" : "Pendiente"}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <GroupTitle title="Campeonato" />
            <Field label="Nombre">
              <input className={inputClass} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
            </Field>
            <Field label="Deporte">
              <select className={inputClass} value={draft.sport} onChange={(event) => updateSport(event.target.value as SportKey)}>
                <option value="futbol">Futbol 11</option>
                <option value="futsal">Futsal</option>
                <option value="voley">Voley</option>
              </select>
            </Field>
            <Field label="Categoria / rama">
              <input className={inputClass} value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} />
            </Field>
            <Field label="Fecha del evento">
              <input className={inputClass} type="date" value={draft.eventDate} onChange={(event) => updateDraft("eventDate", event.target.value)} />
            </Field>
            <Field label="Estado inicial">
              <select className={inputClass} value={draft.status} onChange={(event) => updateDraft("status", event.target.value as EventStatus)}>
                <option value="draft">Borrador</option>
                <option value="registration">Inscripciones</option>
                <option value="in_progress">En juego</option>
                <option value="finished">Finalizado</option>
              </select>
            </Field>
            <Field label="Descripcion publica">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
              />
            </Field>

            <GroupTitle title="Formato e inscripcion" />
            <Field label="Formato">
              <select className={inputClass} value={draft.format} onChange={(event) => updateDraft("format", event.target.value as TournamentFormat)}>
                <option value="league">Liga por puntos</option>
                <option value="single_elimination">Eliminacion directa</option>
                <option value="groups_then_knockout">Grupos + eliminacion</option>
              </select>
            </Field>
            <Field label="Criterio de sorteo">
              <select className={inputClass} value={draft.seedingMode} onChange={(event) => updateDraft("seedingMode", event.target.value as SeedingMode)}>
                <option value="random">Sorteo aleatorio</option>
                <option value="registration_order">Orden de inscripcion</option>
                <option value="manual">Manual</option>
                <option value="ranking">Ranking previo</option>
              </select>
            </Field>
            <Field label="Maximo equipos">
              <input className={inputClass} type="number" min={2} value={draft.maxTeams} onChange={(event) => updateDraft("maxTeams", numberFromInput(event.target.value, 2))} />
            </Field>
            <Field label="Costo inscripcion">
              <input className={inputClass} type="number" min={0} value={draft.registrationFee} onChange={(event) => updateDraft("registrationFee", numberFromInput(event.target.value, 0))} />
            </Field>
            <Field label="Cierre inscripcion">
              <input
                className={inputClass}
                type="datetime-local"
                value={draft.registrationOpenUntil}
                onChange={(event) => updateDraft("registrationOpenUntil", event.target.value)}
              />
            </Field>
            <Field label="Codigos a generar">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={draft.registrationCodeBatch}
                onChange={(event) => updateDraft("registrationCodeBatch", numberFromInput(event.target.value, 0))}
              />
            </Field>
            <Field label="Minimo jugadores">
              <input className={inputClass} type="number" min={1} value={draft.minPlayers} onChange={(event) => updateDraft("minPlayers", numberFromInput(event.target.value, 1))} />
            </Field>
            <Field label="Maximo jugadores">
              <input className={inputClass} type="number" min={draft.minPlayers} value={draft.maxPlayers} onChange={(event) => updateDraft("maxPlayers", numberFromInput(event.target.value, draft.minPlayers))} />
            </Field>
            <div className="md:col-span-2">
              <p className="text-sm font-bold text-ink">Metodos de pago</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["yape", "plin"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => togglePaymentMethod(method)}
                    className={`rounded-md px-4 py-2 text-sm font-bold uppercase ring-1 ring-ink/10 ${
                      draft.paymentMethods.includes(method) ? "bg-ink text-white" : "bg-white text-ink hover:bg-mist"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <GroupTitle title="Reglas, canchas y bases" />
            <Field label="Duracion partido">
              <input
                className={inputClass}
                type="number"
                min={1}
                value={draft.matchDurationMinutes}
                onChange={(event) => updateDraft("matchDurationMinutes", numberFromInput(event.target.value, 1))}
              />
            </Field>
            <Field label="W.O. minutos">
              <input className={inputClass} type="number" min={0} value={draft.walkoverMinutes} onChange={(event) => updateDraft("walkoverMinutes", numberFromInput(event.target.value, 0))} />
            </Field>
            <Field label="Puntos victoria">
              <input className={inputClass} type="number" min={0} value={draft.pointsWin} onChange={(event) => updateDraft("pointsWin", numberFromInput(event.target.value, 0))} />
            </Field>
            <Field label="Puntos empate">
              <input className={inputClass} type="number" min={0} value={draft.pointsDraw} onChange={(event) => updateDraft("pointsDraw", numberFromInput(event.target.value, 0))} />
            </Field>
            <Field label="Hora inicio">
              <input className={inputClass} type="time" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} />
            </Field>
            <Field label="Hora fin">
              <input className={inputClass} type="time" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} />
            </Field>
            <Field label="Transicion">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={draft.transitionMinutes}
                onChange={(event) => updateDraft("transitionMinutes", numberFromInput(event.target.value, 0))}
              />
            </Field>
            <Field label="Descanso minimo">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={draft.minimumRestMinutes}
                onChange={(event) => updateDraft("minimumRestMinutes", numberFromInput(event.target.value, 0))}
              />
            </Field>
            <Field label="Numero de canchas">
              <input
                className={inputClass}
                type="number"
                min={maxCourts > 0 ? 1 : 0}
                max={maxCourts}
                value={draft.courtCount}
                disabled={maxCourts === 0}
                onChange={(event) => updateCourtCount(numberFromInput(event.target.value, 0))}
              />
            </Field>
            <div className="md:col-span-2">
              <p className="text-sm font-bold text-ink">Seleccionar canchas</p>
              {maxCourts > 0 ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {Array.from({ length: draft.courtCount }, (_, index) => {
                    const selectedId = draft.selectedCourtIds[index] ?? "";
                    const usedIds = draft.selectedCourtIds.filter((_, usedIndex) => usedIndex !== index);

                    return (
                      <Field key={index} label={`Cancha ${index + 1}`}>
                        <select
                          className={inputClass}
                          value={selectedId}
                          onChange={(event) => updateSelectedCourt(index, event.target.value)}
                        >
                          {activeVenues.map((venue) => (
                            <option key={venue.id} value={venue.id} disabled={usedIds.includes(venue.id)}>
                              {venue.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-ink/20 p-4 text-sm text-ink/55">
                  No hay canchas activas configuradas.
                </div>
              )}
            </div>
            <Field label="Bases resumidas">
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={draft.basesText}
                onChange={(event) => updateDraft("basesText", event.target.value)}
              />
            </Field>
            <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
              <ToggleRow label="Publicar pagina publica" checked={draft.publishPublicPage} onChange={() => updateDraft("publishPublicPage", !draft.publishPublicPage)} />
              <ToggleRow label="Abrir inscripciones" checked={draft.publishRegistration} onChange={() => updateDraft("publishRegistration", !draft.publishRegistration)} />
              <ToggleRow label="Requiere aprobacion admin" checked={draft.requireApproval} onChange={() => updateDraft("requireApproval", !draft.requireApproval)} />
              <ToggleRow label="Fixture compacto preliminar" checked={draft.allowCompactPreview} onChange={() => updateDraft("allowCompactPreview", !draft.allowCompactPreview)} />
              <ToggleRow label="Tercer lugar" checked={draft.thirdPlace} onChange={() => updateDraft("thirdPlace", !draft.thirdPlace)} />
              <ToggleRow label="Penales en empate" checked={draft.penaltiesEnabled} onChange={() => updateDraft("penaltiesEnabled", !draft.penaltiesEnabled)} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <p className="text-sm text-ink/60">
              {canPublish ? "La configuracion esta completa." : publishErrors[0]}
            </p>
            <Button onClick={() => void publishChampionship()} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {isPublishing ? "Publicando..." : "Publicar campeonato"}
            </Button>
          </div>
        </Card>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="p-5">
            <SectionHeader
              title="Vista actual"
              description="Resumen actualizado con cada cambio."
              action={<Eye className="h-5 w-5 text-ink/45" />}
            />
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Nombre" value={draft.name || "Sin nombre"} />
              <SummaryRow label="Publico" value={`/c/${slug}`} />
              <SummaryRow label="Deporte" value={`${sportLabel(draft.sport)} - ${draft.category || "Sin categoria"}`} />
              <SummaryRow label="Estado" value={eventStatusLabel(draft.status)} />
              <SummaryRow label="Formato" value={tournamentFormatLabel(draft.format)} />
              <SummaryRow label="Inscripcion" value={`${formatMoney(draft.registrationFee)} hasta ${draft.registrationOpenUntil || "sin fecha"}`} />
              <SummaryRow label="Jugadores" value={`${draft.minPlayers} a ${draft.maxPlayers} por equipo`} />
              <SummaryRow label="Canchas" value={selectedVenueNames.join(", ") || "Sin canchas"} />
              <SummaryRow label="Horario" value={`${draft.startTime} - ${draft.endTime}`} />
              <SummaryRow label="Capacidad" value={`${estimatedSlots} partidos estimados / ${estimatedMatches} requeridos`} />
              <SummaryRow label="Pagos" value={draft.paymentMethods.map((method) => method.toUpperCase()).join(", ") || "Sin metodos"} />
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-bold text-ink">Revision final</p>
            <div className="mt-3 space-y-2">
              {readyItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-field" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className={item.done ? "text-ink" : "text-ink/60"}>{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function GroupTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-ink/10 pb-2 md:col-span-2">
      <p className="text-sm font-black uppercase text-ink/55">{title}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-ink/10 pb-2 last:border-0 last:pb-0">
      <p className="font-bold text-ink/50">{label}</p>
      <p className="break-words font-semibold text-ink">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-mist"
    >
      <span>{label}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? "bg-field" : "bg-ink/20"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function buildInitialDraft(event: TournamentEvent | null, activeVenues: CompetitionData["venues"]): ChampionshipDraft {
  const sport = event?.sport ?? "futbol";
  const defaults = sportDefaults[sport];
  const defaultCourtIds = getDefaultCourtIds(event, activeVenues);

  return {
    name: event?.name ?? defaults.name,
    sport,
    category: event?.category ?? defaults.category,
    eventDate: event?.eventDate ? toDateInput(event.eventDate) : todayDateInput(),
    status: event?.status ?? "registration",
    description: event?.rulesSummary ?? "Inscripcion abierta para equipos de la carrera.",
    format: event?.format ?? "single_elimination",
    seedingMode: event?.seedingMode ?? "registration_order",
    maxTeams: event?.maxTeams ?? defaults.maxTeams,
    thirdPlace: event?.thirdPlace ?? true,
    allowByes: event?.allowByes ?? true,
    penaltiesEnabled: event?.penaltiesEnabled ?? true,
    registrationFee: event?.registrationFee ?? 40,
    registrationOpenUntil: event?.registrationOpenUntil ? toDateTimeLocal(event.registrationOpenUntil) : nextWeekDateTimeLocal(),
    minPlayers: event?.minPlayers ?? defaults.minPlayers,
    maxPlayers: event?.maxPlayers ?? defaults.maxPlayers,
    paymentMethods: ["yape", "plin"],
    registrationCodeBatch: event?.maxTeams ?? defaults.maxTeams,
    requireApproval: true,
    matchDurationMinutes: event?.scheduleConfig?.matchDurationMinutes ?? defaults.matchDurationMinutes,
    walkoverMinutes: 10,
    pointsWin: event?.pointsWin ?? 3,
    pointsDraw: event?.pointsDraw ?? 1,
    pointsLoss: event?.pointsLoss ?? 0,
    startTime: event?.scheduleConfig?.startTime ?? "09:00",
    endTime: "18:00",
    transitionMinutes: event?.scheduleConfig?.transitionMinutes ?? 0,
    minimumRestMinutes: event?.minimumRestMinutes ?? event?.scheduleConfig?.minimumRestMinutes ?? 60,
    allowCompactPreview: event?.fixtureCompactPreview ?? event?.scheduleConfig?.allowCompactPreview ?? true,
    courtCount: defaultCourtIds.length,
    selectedCourtIds: defaultCourtIds,
    basesText: event?.rulesSummary ?? "",
    publishPublicPage: true,
    publishRegistration: true
  };
}

function normalizeCourtSelection(draft: ChampionshipDraft, activeVenues: CompetitionData["venues"]) {
  const maxCourts = activeVenues.length;
  if (maxCourts === 0) {
    return { ...draft, courtCount: 0, selectedCourtIds: [] };
  }

  const courtCount = clamp(draft.courtCount || 1, 1, maxCourts);
  const selectedCourtIds = draft.selectedCourtIds.filter((id) => activeVenues.some((venue) => venue.id === id));

  for (const venue of activeVenues) {
    if (selectedCourtIds.length >= courtCount) break;
    if (!selectedCourtIds.includes(venue.id)) selectedCourtIds.push(venue.id);
  }

  return {
    ...draft,
    courtCount,
    selectedCourtIds: selectedCourtIds.slice(0, courtCount)
  };
}

function getDefaultCourtIds(event: TournamentEvent | null, activeVenues: CompetitionData["venues"]) {
  const fromEvent =
    event?.scheduleConfig?.courts
      .map((court) => activeVenues.find((venue) => venue.id === court || venue.name === court)?.id)
      .filter((id): id is string => Boolean(id)) ?? [];

  if (fromEvent.length > 0) return fromEvent.slice(0, activeVenues.length);

  return activeVenues.slice(0, Math.min(2, Math.max(1, activeVenues.length))).map((venue) => venue.id);
}

function getPublishErrors(draft: ChampionshipDraft, selectedCourtCount: number, maxCourts: number) {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Ingresa el nombre del campeonato.");
  if (!draft.category.trim()) errors.push("Ingresa la categoria o rama.");
  if (!draft.eventDate) errors.push("Selecciona la fecha del evento.");
  if (draft.maxTeams < 2) errors.push("El campeonato necesita al menos 2 equipos.");
  if (draft.minPlayers < 1) errors.push("El minimo de jugadores debe ser mayor a 0.");
  if (draft.maxPlayers < draft.minPlayers) errors.push("El maximo de jugadores no puede ser menor al minimo.");
  if (!draft.registrationOpenUntil) errors.push("Selecciona el cierre de inscripcion.");
  if (draft.publishRegistration && draft.paymentMethods.length === 0) errors.push("Elige al menos un metodo de pago.");
  if (maxCourts === 0) errors.push("Configura al menos una cancha activa.");
  if (maxCourts > 0 && selectedCourtCount !== draft.courtCount) errors.push("Selecciona todas las canchas del campeonato.");
  if (minutesBetween(draft.startTime, draft.endTime) <= 0) errors.push("La hora de fin debe ser mayor que la hora de inicio.");

  return errors;
}

function estimateMatchCount(draft: ChampionshipDraft) {
  if (draft.format === "league") return Math.floor((draft.maxTeams * (draft.maxTeams - 1)) / 2);
  if (draft.format === "single_elimination") return Math.max(draft.maxTeams - 1 + (draft.thirdPlace ? 1 : 0), 1);

  const groupMatches = draft.maxTeams;
  const knockoutMatches = Math.max(Math.ceil(draft.maxTeams / 2) - 1 + (draft.thirdPlace ? 1 : 0), 1);
  return groupMatches + knockoutMatches;
}

function numberFromInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function minutesBetween(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;

  return end - start;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function nextWeekDateTimeLocal() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(23, 59, 0, 0);

  return toDateTimeLocal(date.toISOString());
}

function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayDateInput();

  return date.toISOString().slice(0, 10);
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
