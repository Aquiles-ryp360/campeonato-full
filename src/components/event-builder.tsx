"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { events } from "@/lib/mock-data";
import { formatLabel, sportLabel } from "@/lib/utils";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";
import type { Sport, TournamentFormat } from "@/lib/types";

export function EventBuilder() {
  const [sport, setSport] = useState<Sport>("futsal");
  const [format, setFormat] = useState<TournamentFormat>("league");

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
              <input className={inputClass} placeholder="Ej. Copa Sistemas 2026" />
            </Field>
            <Field label="Categoria">
              <input className={inputClass} placeholder="Varones, mixto, libre..." />
            </Field>
            <Field label="Deporte">
              <select
                className={inputClass}
                value={sport}
                onChange={(event) => setSport(event.target.value as Sport)}
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
              <input className={inputClass} type="datetime-local" />
            </Field>
            <Field label="Costo de inscripcion">
              <input className={inputClass} type="number" min={0} defaultValue={40} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Vista previa" description="Asi aparecera para los delegados." />
          <div className="mt-5 rounded-md border border-ink/10 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{sportLabel(sport)}</Badge>
              <Badge tone="blue">{formatLabel(format)}</Badge>
              <Badge tone="amber">S/ 40</Badge>
            </div>
            <h3 className="mt-5 text-2xl font-bold text-ink">Nuevo campeonato</h3>
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
            <input className={inputClass} type="number" min={2} defaultValue={12} />
          </Field>
          <Field label="Jugadores minimo">
            <input className={inputClass} type="number" min={1} defaultValue={6} />
          </Field>
          <Field label="Jugadores maximo">
            <input className={inputClass} type="number" min={1} defaultValue={12} />
          </Field>
          <Field label="Partidos por fecha">
            <input className={inputClass} type="number" min={1} defaultValue={4} />
          </Field>
          <Field label="Puntos por ganar">
            <input className={inputClass} type="number" defaultValue={format === "league" ? 3 : 0} />
          </Field>
          <Field label="Puntos por empatar">
            <input className={inputClass} type="number" defaultValue={format === "league" ? 1 : 0} />
          </Field>
          <Field label="Puntos por perder">
            <input className={inputClass} type="number" defaultValue={0} />
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
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => toast.success("Evento guardado como borrador")}>
            <Save className="h-4 w-4" />
            Guardar evento
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Eventos existentes" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border border-ink/10 bg-white p-4">
              <p className="font-bold">{event.name}</p>
              <p className="mt-1 text-sm text-ink/60">
                {sportLabel(event.sport)} · {formatLabel(event.format)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
