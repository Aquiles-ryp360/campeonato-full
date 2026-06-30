"use client";

import { useEffect, useMemo, useState } from "react";
import type { Venue } from "@/lib/types";
import { Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function ScheduleConfigForm({ venues = [] }: { venues?: Venue[] }) {
  const activeVenues = useMemo(() => venues.filter((venue) => venue.active), [venues]);
  const maxCourts = activeVenues.length;
  const [courtCount, setCourtCount] = useState(() => Math.min(2, Math.max(1, maxCourts)));
  const [selectedCourts, setSelectedCourts] = useState<string[]>(() =>
    activeVenues.slice(0, Math.min(2, Math.max(1, maxCourts))).map((venue) => venue.id)
  );

  useEffect(() => {
    if (maxCourts === 0) {
      setCourtCount(0);
      setSelectedCourts([]);
      return;
    }

    const nextCount = Math.min(Math.max(courtCount || 1, 1), maxCourts);
    setCourtCount(nextCount);
    setSelectedCourts((current) => {
      const preserved = current.filter((id) => activeVenues.some((venue) => venue.id === id));
      const missing = activeVenues
        .filter((venue) => !preserved.includes(venue.id))
        .map((venue) => venue.id);

      return [...preserved, ...missing].slice(0, nextCount);
    });
  }, [activeVenues, courtCount, maxCourts]);

  function updateCourtCount(value: number) {
    const nextCount = Math.min(Math.max(value, 1), maxCourts);
    setCourtCount(nextCount);
    setSelectedCourts((current) => {
      const next = [...current];
      for (const venue of activeVenues) {
        if (next.length >= nextCount) break;
        if (!next.includes(venue.id)) next.push(venue.id);
      }

      return next.slice(0, nextCount);
    });
  }

  function updateSelectedCourt(index: number, venueId: string) {
    setSelectedCourts((current) =>
      current.map((selectedId, currentIndex) => (currentIndex === index ? venueId : selectedId))
    );
  }

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
          <input className={inputClass} type="number" defaultValue={20} />
        </Field>
        <Field label="Descanso minimo">
          <input className={inputClass} type="number" defaultValue={40} />
        </Field>
        <Field label="Transicion">
          <input className={inputClass} type="number" defaultValue={0} />
        </Field>
        <Field label="Numero de canchas">
          <select
            className={inputClass}
            value={courtCount}
            disabled={maxCourts === 0}
            onChange={(event) => updateCourtCount(Number(event.target.value))}
          >
            {maxCourts === 0 ? (
              <option value={0}>Sin canchas activas</option>
            ) : (
              Array.from({ length: maxCourts }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Fixture compacto preliminar">
          <select className={inputClass} defaultValue="yes">
            <option value="yes">Permitido</option>
            <option value="no">No permitido</option>
          </select>
        </Field>
      </div>
      <div className="mt-5">
        <p className="text-sm font-bold text-ink">Seleccionar canchas</p>
        {maxCourts > 0 ? (
          <>
            <p className="mt-1 text-sm text-ink/60">
              Hay {maxCourts} cancha(s) activas. Elige {courtCount} para este campeonato.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {Array.from({ length: courtCount }, (_, index) => {
                const selectedId = selectedCourts[index] ?? "";
                const usedIds = selectedCourts.filter((_, usedIndex) => usedIndex !== index);

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
          </>
        ) : (
          <div className="mt-3 rounded-md border border-dashed border-ink/20 p-4 text-sm text-ink/55">
            No hay canchas activas configuradas.
          </div>
        )}
      </div>
    </Card>
  );
}
