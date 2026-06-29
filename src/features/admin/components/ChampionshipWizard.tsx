"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { TournamentFormat, SportKey } from "@/lib/types";
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

export function ChampionshipWizard({ data }: { data: CompetitionData }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Nuevo campeonato");
  const [sport, setSport] = useState<SportKey>("futsal");
  const [format, setFormat] = useState<TournamentFormat>("groups_then_knockout");

  function saveDraft() {
    if (!hasSupabaseEnv()) {
      toast.info("Modo mock: el wizard queda como preview hasta configurar Supabase.");
      return;
    }

    toast.success("Borrador preparado para guardarse en Supabase.");
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Wizard"
        title="Crear campeonato"
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
          <SectionHeader title="Datos generales" action={<Badge tone="amber">Borrador</Badge>} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Deporte">
              <select className={inputClass} value={sport} onChange={(event) => setSport(event.target.value as SportKey)}>
                <option value="futsal">Futsal</option>
                <option value="futbol">Futbol</option>
                <option value="voley">Voley</option>
              </select>
            </Field>
            <Field label="Categoria / rama">
              <input className={inputClass} placeholder="Varones, damas, mixto" />
            </Field>
            <Field label="Fecha del evento">
              <input className={inputClass} type="date" />
            </Field>
            <Field label="Estado">
              <select className={inputClass} defaultValue="draft">
                <option value="draft">Borrador</option>
                <option value="registration">Inscripciones</option>
                <option value="in_progress">En curso</option>
                <option value="finished">Finalizado</option>
              </select>
            </Field>
            <Field label="Descripcion">
              <textarea className={`${inputClass} min-h-24 resize-y`} />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="p-5">
          <SectionHeader title="Formato" description="Elige la estructura competitiva y sus parametros." />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Formato">
              <select className={inputClass} value={format} onChange={(event) => setFormat(event.target.value as TournamentFormat)}>
                <option value="league">Liga por puntos</option>
                <option value="single_elimination">Eliminacion directa</option>
                <option value="groups_then_knockout">Grupos + eliminacion</option>
              </select>
            </Field>
            <Field label="Maximo equipos">
              <input className={inputClass} type="number" min={2} defaultValue={12} />
            </Field>
            <Field label="Tercer lugar">
              <select className={inputClass} defaultValue="yes">
                <option value="yes">Activado</option>
                <option value="no">Desactivado</option>
              </select>
            </Field>
          </div>
          <div className="mt-5">
            <FormatConfigForm />
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-5">
          <SectionHeader title="Reglas deportivas" />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Field label="Duracion partido">
              <input className={inputClass} type="number" defaultValue={sport === "futbol" ? 90 : 40} />
            </Field>
            <Field label="W.O. minutos">
              <input className={inputClass} type="number" defaultValue={10} />
            </Field>
            <Field label="Puntos victoria">
              <input className={inputClass} type="number" defaultValue={3} />
            </Field>
            <Field label="Puntos empate">
              <input className={inputClass} type="number" defaultValue={1} />
            </Field>
          </div>
        </Card>
      ) : null}

      {step === 3 ? <ScheduleConfigForm venues={data.venues} /> : null}
      {step === 4 ? <BasesUploadForm /> : null}
      {step === 5 ? <FixtureGenerationPanel data={data} /> : null}

      <div className="flex justify-end">
        <Button onClick={saveDraft}>
          <Save className="h-4 w-4" />
          Guardar {name}
        </Button>
      </div>
    </div>
  );
}
