"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { mapEvent, type EventRow } from "@/lib/data-mappers";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { formatLabel, sportLabel } from "@/lib/utils";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";
import type { SportKey, TournamentEvent, TournamentFormat } from "@/lib/types";

const newEventSelectColumns = `
  id,
  name,
  sport_id,
  category,
  format_id,
  status,
  registration_fee,
  registration_open_until,
  max_teams,
  min_players,
  max_players,
  points_win,
  points_draw,
  points_loss,
  rules_summary,
  prevent_cross_sport_conflicts,
  minimum_rest_minutes
`;

const legacyEventSelectColumns = `
  id,
  name,
  sport,
  category,
  format,
  status,
  registration_fee,
  registration_open_until,
  max_teams,
  min_players,
  max_players,
  points_win,
  points_draw,
  points_loss,
  rules_summary
`;

export function EventBuilder({ initialEvents }: { initialEvents: TournamentEvent[] }) {
  const [eventList, setEventList] = useState(initialEvents);
  const [eventName, setEventName] = useState("");
  const [category, setCategory] = useState("");
  const [sport, setSport] = useState<SportKey>("futsal");
  const [format, setFormat] = useState<TournamentFormat>("league");
  const [registrationOpenUntil, setRegistrationOpenUntil] = useState("2026-07-31T23:59");
  const [registrationFee, setRegistrationFee] = useState(40);
  const [maxTeams, setMaxTeams] = useState(12);
  const [minPlayers, setMinPlayers] = useState(6);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [rulesSummary, setRulesSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveEvent() {
    if (!eventName.trim() || !category.trim()) {
      toast.error("Completa nombre del evento y categoria.");
      return;
    }

    if (minPlayers > maxPlayers) {
      toast.error("El minimo de jugadores no puede ser mayor al maximo.");
      return;
    }

    if (!hasSupabaseEnv()) {
      toast.error("Supabase no esta configurado en el navegador.");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        toast.error("Inicia sesion como admin para crear eventos.");
        return;
      }

      const baseEvent = {
        name: eventName.trim(),
        slug: slugify(eventName),
        category: category.trim(),
        status: "draft",
        registration_fee: registrationFee,
        registration_open_until: new Date(registrationOpenUntil).toISOString(),
        max_teams: maxTeams,
        min_players: minPlayers,
        max_players: maxPlayers,
        points_win: pointsWin,
        points_draw: pointsDraw,
        points_loss: pointsLoss,
        rules_summary: rulesSummary.trim(),
        created_by: userData.user.id
      };

      const catalogRefs = await resolveCatalogRefs(supabase, sport, format);
      const { data, error } = catalogRefs
        ? await supabase
            .from("events")
            .insert({
              ...baseEvent,
              sport_id: catalogRefs.sportId,
              format_id: catalogRefs.formatId,
              prevent_cross_sport_conflicts: false,
              minimum_rest_minutes: 60
            })
            .select(newEventSelectColumns)
            .single<EventRow>()
        : await supabase
            .from("events")
            .insert({
              ...baseEvent,
              sport,
              format
            })
            .select(legacyEventSelectColumns)
            .single<EventRow>();

      if (error || !data) {
        toast.error(
          error?.message.includes("duplicate")
            ? "Ya existe un evento con ese nombre o slug."
            : "No se pudo guardar el evento en Supabase."
        );
        return;
      }

      setEventList((current) => [mapEvent({ ...data, sport, format }), ...current]);
      setEventName("");
      setCategory("");
      setRulesSummary("");
      toast.success("Evento guardado en Supabase como borrador.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Configuracion"
        title="Crear evento deportivo"
        description="Define las reglas antes de abrir inscripciones para delegados."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <Card className="p-5">
          <SectionHeader title="Datos principales" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del evento">
              <input
                className={inputClass}
                placeholder="Ej. Copa Sistemas 2026"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
              />
            </Field>
            <Field label="Categoria">
              <input
                className={inputClass}
                placeholder="Varones, mixto, libre..."
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </Field>
            <Field label="Deporte">
              <select
                className={inputClass}
                value={sport}
                onChange={(event) => setSport(event.target.value as SportKey)}
              >
                <option value="futsal">Futsal varones</option>
                <option value="voley">Voley mixto</option>
              </select>
            </Field>
            <Field label="Formato">
              <select
                className={inputClass}
                value={format}
                onChange={(event) => setFormat(event.target.value as TournamentFormat)}
              >
                <option value="league">Liga por puntos</option>
                <option value="single_elimination">Eliminacion directa</option>
                <option value="groups_then_knockout">Grupos + eliminacion</option>
              </select>
            </Field>
            <Field label="Cierre de inscripcion">
              <input
                className={inputClass}
                type="datetime-local"
                value={registrationOpenUntil}
                onChange={(event) => setRegistrationOpenUntil(event.target.value)}
              />
            </Field>
            <Field label="Costo de inscripcion">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={registrationFee}
                onChange={(event) => setRegistrationFee(Number(event.target.value))}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Vista previa" description="Asi aparecera para los delegados." />
          <div className="mt-5 rounded-md border border-ink/10 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{sportLabel(sport)}</Badge>
              <Badge tone="blue">{formatLabel(format)}</Badge>
              <Badge tone="amber">S/ {registrationFee}</Badge>
            </div>
            <h3 className="mt-5 text-2xl font-bold text-ink">
              {eventName.trim() || "Nuevo campeonato"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/62">
              Los equipos veran cupos, reglas, jugadores minimos y el metodo de pago
              configurado por el administrador.
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader title="Reglas deportivas" description="Estas reglas alimentan tabla, fixture y validaciones." />
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Field label="Maximo equipos">
            <input
              className={inputClass}
              type="number"
              min={2}
              value={maxTeams}
              onChange={(event) => setMaxTeams(Number(event.target.value))}
            />
          </Field>
          <Field label="Jugadores minimo">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={minPlayers}
              onChange={(event) => setMinPlayers(Number(event.target.value))}
            />
          </Field>
          <Field label="Jugadores maximo">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(Number(event.target.value))}
            />
          </Field>
          <Field label="Partidos por fecha">
            <input className={inputClass} type="number" min={1} defaultValue={4} />
          </Field>
          <Field label="Puntos por ganar">
            <input
              className={inputClass}
              type="number"
              value={pointsWin}
              onChange={(event) => setPointsWin(Number(event.target.value))}
            />
          </Field>
          <Field label="Puntos por empatar">
            <input
              className={inputClass}
              type="number"
              value={pointsDraw}
              onChange={(event) => setPointsDraw(Number(event.target.value))}
            />
          </Field>
          <Field label="Puntos por perder">
            <input
              className={inputClass}
              type="number"
              value={pointsLoss}
              onChange={(event) => setPointsLoss(Number(event.target.value))}
            />
          </Field>
          <Field label="Cancha principal">
            <input className={inputClass} placeholder="Losa principal" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Resumen de reglas">
            <textarea
              className={`${inputClass} min-h-28 resize-y`}
              placeholder="Clasifican cuatro mejores, empate se define por diferencia de goles..."
              value={rulesSummary}
              onChange={(event) => setRulesSummary(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => void saveEvent()} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar evento"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Eventos existentes" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {eventList.length > 0 ? eventList.map((event) => (
            <div key={event.id} className="rounded-md border border-ink/10 bg-white p-4">
              <p className="font-bold">{event.name}</p>
              <p className="mt-1 text-sm text-ink/60">
                {sportLabel(event.sport)} · {formatLabel(event.format)}
              </p>
            </div>
          )) : (
            <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55 md:col-span-3">
              Todavia no hay eventos creados en Supabase.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `evento-${Date.now()}`;
}

async function resolveCatalogRefs(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  sport: SportKey,
  format: TournamentFormat
) {
  const sportName = sport === "voley" ? "V%" : sport === "futbol" ? "F%" : "Futsal";
  const [sportResponse, formatResponse] = await Promise.all([
    supabase.from("sports").select("id").ilike("name", sportName).limit(1).maybeSingle(),
    supabase.from("competition_formats").select("id").eq("key", format).maybeSingle()
  ]);

  if (sportResponse.error || formatResponse.error) return null;
  if (!sportResponse.data?.id || !formatResponse.data?.id) return null;

  return {
    sportId: sportResponse.data.id as string,
    formatId: formatResponse.data.id as string
  };
}
