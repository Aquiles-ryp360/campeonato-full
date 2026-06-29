import { Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function ScheduleConfigForm() {
  return (
    <Card className="p-5">
      <SectionHeader title="Canchas y horarios" description="Configuracion para campeonatos de un solo dia." />
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Field label="Hora inicio">
          <input className={inputClass} type="time" defaultValue="09:00" />
        </Field>
        <Field label="Hora fin">
          <input className={inputClass} type="time" defaultValue="18:00" />
        </Field>
        <Field label="Duracion partido">
          <input className={inputClass} type="number" defaultValue={40} />
        </Field>
        <Field label="Descanso minimo">
          <input className={inputClass} type="number" defaultValue={60} />
        </Field>
      </div>
    </Card>
  );
}
