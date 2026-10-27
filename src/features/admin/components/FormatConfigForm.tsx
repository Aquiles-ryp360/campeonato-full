import type { SeedingMode, TournamentFormat } from "@/lib/types";
import { Field, SectionHeader, inputClass } from "@/components/ui";
import { NumberControl } from "./NumberControl";
import { HoldHint } from "./HoldHint";
import {
  ByesIllustration,
  GroupCountIllustration,
  SeedingIllustration,
  ThirdPlaceIllustration
} from "./FormatIllustrations";

const seedingHelp: Record<SeedingMode, string> = {
  registration_order: "El primero en inscribirse es la semilla 1, el segundo la 2, etc. Las mejores semillas se cruzan con las ultimas.",
  random: "El sistema sortea el orden de los equipos al azar. Es lo mas usado en campeonatos internos.",
  manual: "El administrador define a mano el orden de los equipos en la llave.",
  ranking: "Se ordena por un ranking previo (por ejemplo, resultados del campeonato anterior)."
};

export function FormatConfigForm({
  format,
  seedingMode,
  onSeedingModeChange,
  thirdPlace,
  onThirdPlaceChange,
  allowByes,
  onAllowByesChange,
  groupCount,
  onGroupCountChange,
  maxTeams
}: {
  format: TournamentFormat;
  seedingMode: SeedingMode;
  onSeedingModeChange: (value: SeedingMode) => void;
  thirdPlace: boolean;
  onThirdPlaceChange: (value: boolean) => void;
  allowByes: boolean;
  onAllowByesChange: (value: boolean) => void;
  groupCount: number;
  onGroupCountChange: (value: number) => void;
  maxTeams: number;
}) {
  const teamsPerGroup = Math.max(1, Math.ceil(maxTeams / Math.max(1, groupCount)));

  return (
    <section className="rounded-md border border-brand-towerMid/25 bg-brand-wash/50 p-5">
      <SectionHeader title="Parametros del formato" description={descriptionByFormat[format]} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {format !== "league" ? (
          <>
            <Field
              label={
                <HoldHint
                  title="Criterio de sembrado"
                  description={
                    <>
                      Define como se ordenan los equipos para armar los cruces. {seedingHelp[seedingMode]}
                    </>
                  }
                  illustration={<SeedingIllustration mode={seedingMode} />}
                >
                  Criterio de sembrado
                </HoldHint>
              }
            >
              <select
                className={inputClass}
                value={seedingMode}
                onChange={(event) => onSeedingModeChange(event.target.value as SeedingMode)}
              >
                <option value="registration_order">Orden de inscripcion</option>
                <option value="random">Sorteo aleatorio</option>
                <option value="manual">Manual</option>
                <option value="ranking">Ranking previo</option>
              </select>
            </Field>
            <Field
              label={
                <HoldHint
                  title="Tercer lugar"
                  description="Si esta activado, los dos perdedores de semifinales juegan un partido extra para definir el 3er puesto. Suma 1 partido al fixture."
                  illustration={<ThirdPlaceIllustration />}
                >
                  Tercer lugar
                </HoldHint>
              }
            >
              <select
                className={inputClass}
                value={thirdPlace ? "yes" : "no"}
                onChange={(event) => onThirdPlaceChange(event.target.value === "yes")}
              >
                <option value="yes">Activado</option>
                <option value="no">Desactivado</option>
              </select>
            </Field>
            <Field
              label={
                <HoldHint
                  title="Permitir byes"
                  description="Un bye es pasar a la siguiente ronda sin jugar. Si los equipos no son 4, 8 o 16, los mejor sembrados pasan directo y el resto juega una ronda preliminar. Si lo desactivas, la llave exige 4, 8, 16 o 32 equipos exactos."
                  illustration={<ByesIllustration />}
                >
                  Permitir byes
                </HoldHint>
              }
            >
              <select
                className={inputClass}
                value={allowByes ? "yes" : "no"}
                onChange={(event) => onAllowByesChange(event.target.value === "yes")}
              >
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </Field>
          </>
        ) : (
          <>
            <Info label="Clasificacion" value="Tabla general por puntos" />
            <Info label="Cruces" value="Todos contra todos" />
            <Info label="Empates" value="Suman puntos segun reglas" />
          </>
        )}

        {format === "groups_then_knockout" ? (
          <>
            <Field
              label={
                <HoldHint
                  title="Numero de grupos"
                  description={`Los ${maxTeams} equipos se reparten en ${groupCount} grupos lo mas parejos posible; dentro de cada grupo juegan todos contra todos. En amarillo, los 2 que clasifican de cada grupo.`}
                  illustration={<GroupCountIllustration teams={maxTeams} groups={groupCount} />}
                >
                  Numero de grupos
                </HoldHint>
              }
            >
              <NumberControl
                value={groupCount}
                min={2}
                max={8}
                onChange={onGroupCountChange}
              />
            </Field>
            <Info label="Equipos aprox. por grupo" value={`${teamsPerGroup}`} />
          </>
        ) : null}
      </div>
    </section>
  );
}

const descriptionByFormat: Record<TournamentFormat, string> = {
  league: "Liga usa puntos y permite empates segun las reglas deportivas.",
  single_elimination: "Eliminacion directa no usa puntos ni empates en tabla; los empates se resuelven por penales.",
  groups_then_knockout: "Primero grupos por puntos y luego llave de eliminacion para clasificados."
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-brand-towerMid/25 bg-white px-3 py-2 shadow-insetLine">
      <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
