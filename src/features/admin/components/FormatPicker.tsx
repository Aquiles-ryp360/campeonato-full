"use client";

import type { TournamentFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FormatIllustration } from "./FormatIllustrations";
import { HoldHint } from "./HoldHint";

export const formatOptions: Array<{
  value: TournamentFormat;
  title: string;
  summary: string;
  details: string;
}> = [
  {
    value: "league",
    title: "Liga por puntos",
    summary: "Todos contra todos. Gana quien sume mas puntos.",
    details:
      "Cada equipo juega contra todos los demas. Victoria, empate y derrota suman puntos en una tabla general; el primero de la tabla es campeon. Es el formato mas justo, pero el que mas partidos necesita: con 10 equipos son 45 partidos."
  },
  {
    value: "single_elimination",
    title: "Eliminacion directa",
    summary: "Llave de partidos unicos. El que pierde queda fuera.",
    details:
      "Los equipos se cruzan en una llave (cuartos, semifinal, final). Cada partido define quien sigue; si hay empate se va a penales. Es el mas rapido: con 12 equipos son 11 partidos. Si el numero de equipos no es 4, 8 o 16, se juega una ronda preliminar."
  },
  {
    value: "groups_then_knockout",
    title: "Grupos + eliminacion",
    summary: "Primero grupos todos contra todos; los mejores pasan a la llave.",
    details:
      "Los equipos se sortean en grupos y juegan todos contra todos dentro del grupo. El 1.° y 2.° de cada grupo pasan a una llave de eliminacion directa hasta la final. Combina varios partidos asegurados por equipo con una fase final emocionante. Es el formato del Intersemestres."
  }
];

export function FormatPicker({
  value,
  onChange
}: {
  value: TournamentFormat;
  onChange: (value: TournamentFormat) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Formato del campeonato" className="grid gap-3 md:grid-cols-3">
      {formatOptions.map((option) => {
        const selected = option.value === value;
        return (
          <div
            key={option.value}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange(option.value);
              }
            }}
            className={cn(
              "cursor-pointer select-none rounded-lg border-2 bg-white p-3 transition focus:outline-none focus:ring-2 focus:ring-brand-electric",
              selected ? "border-brand-electric shadow-lift" : "border-brand-towerMid/25 hover:border-brand-electric/50"
            )}
          >
            <div className="rounded-md bg-brand-wash/70 p-2">
              <FormatIllustration format={option.value} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <HoldHint
                title={option.title}
                description={option.details}
                illustration={<FormatIllustration format={option.value} />}
              >
                <span className="text-sm font-black text-brand-navy">{option.title}</span>
              </HoldHint>
              <span
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2",
                  selected ? "border-brand-electric bg-brand-electric" : "border-brand-towerMid/50"
                )}
              />
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-brand-muted">{option.summary}</p>
          </div>
        );
      })}
      <p className="text-xs font-semibold text-brand-muted md:col-span-3">
        Manten presionado el nombre de un formato (o deja el mouse encima) para ver la explicacion completa.
      </p>
    </div>
  );
}
