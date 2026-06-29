import { Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function FormatConfigForm() {
  return (
    <Card className="p-5">
      <SectionHeader title="Formato de competencia" description="Parametros reutilizables para liga, eliminacion o grupos." />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="Formato">
          <select className={inputClass} defaultValue="groups_then_knockout">
            <option value="league">Liga por puntos</option>
            <option value="single_elimination">Eliminacion directa</option>
            <option value="groups_then_knockout">Grupos + eliminacion</option>
          </select>
        </Field>
        <Field label="Clasificados por grupo">
          <input className={inputClass} type="number" min={1} defaultValue={2} />
        </Field>
        <Field label="Tercer lugar">
          <select className={inputClass} defaultValue="yes">
            <option value="yes">Activado</option>
            <option value="no">Desactivado</option>
          </select>
        </Field>
      </div>
    </Card>
  );
}
