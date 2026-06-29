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
        <Field label="Criterio de sembrado">
          <select className={inputClass} defaultValue="registration_order">
            <option value="random">Sorteo aleatorio</option>
            <option value="registration_order">Orden de inscripcion</option>
            <option value="manual">Manual</option>
            <option value="ranking">Ranking previo</option>
          </select>
        </Field>
        <Field label="Tercer lugar">
          <select className={inputClass} defaultValue="yes">
            <option value="yes">Activado</option>
            <option value="no">Desactivado</option>
          </select>
        </Field>
        <Field label="Maximo equipos">
          <input className={inputClass} type="number" min={2} defaultValue={10} />
        </Field>
        <Field label="Permitir byes">
          <select className={inputClass} defaultValue="yes">
            <option value="yes">Si</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Penales en empate">
          <select className={inputClass} defaultValue="yes">
            <option value="yes">Si</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>
    </Card>
  );
}
