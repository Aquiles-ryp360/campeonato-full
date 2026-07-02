import { Field, SectionHeader, inputClass } from "@/components/ui";

export function ScheduleConfigForm({
  startTime,
  onStartTimeChange,
  courtCount,
  onCourtCountChange,
  matchDuration,
  halfTimeMinute,
  transitionMinutes,
  matchStartToleranceMinutes,
  onMatchStartToleranceMinutesChange,
  fixtureCompactPreview,
  onFixtureCompactPreviewChange,
  publicLiveScores,
  onPublicLiveScoresChange,
  estimatedEndTime,
  estimatedMatches
}: {
  startTime: string;
  onStartTimeChange: (value: string) => void;
  courtCount: number;
  onCourtCountChange: (value: number) => void;
  matchDuration: number;
  halfTimeMinute: number;
  transitionMinutes: number;
  matchStartToleranceMinutes: number;
  onMatchStartToleranceMinutesChange: (value: number) => void;
  fixtureCompactPreview: boolean;
  onFixtureCompactPreviewChange: (value: boolean) => void;
  publicLiveScores: boolean;
  onPublicLiveScoresChange: (value: boolean) => void;
  estimatedEndTime: string;
  estimatedMatches: number;
}) {
  const courtNames = Array.from({ length: courtCount }, (_, index) => `Cancha ${String.fromCharCode(65 + index)}`);

  return (
    <section className="rounded-lg border border-brand-towerMid/25 bg-white p-5 shadow-panel backdrop-blur">
      <SectionHeader title="Canchas y horarios" description="Configuracion para campeonatos de un solo dia." />
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Field label="Hora inicio">
          <input
            className={inputClass}
            type="time"
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
          />
        </Field>
        <Field label="Cantidad de canchas">
          <div className="grid min-h-10 grid-cols-3 rounded-md border border-brand-towerMid/25 bg-white p-1">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onCourtCountChange(count)}
                className={`rounded px-3 py-1.5 text-sm font-bold transition ${
                  courtCount === count ? "bg-brand-navy text-white" : "text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </Field>
        <Info label="Duracion partido" value={`${matchDuration} min`} />
        <Info label="Medio tiempo" value={`Minuto ${halfTimeMinute}`} />
        <Info label="Pausa entre partidos" value={`${transitionMinutes} min`} />
        <Field label="Tolerancia de inicio">
          <input
            className={inputClass}
            type="number"
            min={0}
            max={120}
            value={matchStartToleranceMinutes}
            onChange={(event) => onMatchStartToleranceMinutesChange(Number(event.target.value))}
          />
        </Field>
        <Info label="Hora fin estimada" value={estimatedEndTime} />
        <Info label="Partidos estimados" value={`${estimatedMatches}`} />
        <Field label="Canchas asignadas">
          <select className={inputClass} value={courtCount} onChange={(event) => onCourtCountChange(Number(event.target.value))}>
            {[1, 2, 3].map((count) => (
              <option key={count} value={count}>
                {Array.from({ length: count }, (_, index) => `Cancha ${String.fromCharCode(65 + index)}`).join(", ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fixture compacto">
          <select
            className={inputClass}
            value={fixtureCompactPreview ? "yes" : "no"}
            onChange={(event) => onFixtureCompactPreviewChange(event.target.value === "yes")}
          >
            <option value="yes">Permitido</option>
            <option value="no">No permitido</option>
          </select>
        </Field>
        <Field label="Marcador publico en vivo">
          <select
            className={inputClass}
            value={publicLiveScores ? "yes" : "no"}
            onChange={(event) => onPublicLiveScoresChange(event.target.value === "yes")}
          >
            <option value="yes">Visible</option>
            <option value="no">Oculto hasta validar</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {courtNames.map((court) => (
          <span key={court} className="rounded-md bg-brand-wash px-3 py-1.5 text-sm font-semibold text-brand-muted">
            {court}
          </span>
        ))}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-brand-towerMid/25 bg-brand-wash/50 px-3 py-2">
      <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
