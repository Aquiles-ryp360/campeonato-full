'use client';

import { useState } from 'react';
import { useChampionships, useChampionshipStandings } from '@/hooks/useChampionship';
import { Card, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Trophy, Info } from 'lucide-react';
import type { StandingsEntry } from '@/types';

export default function StandingsPage() {
  const { data: champsData, isLoading: champsLoading } = useChampionships();
  const championships = champsData?.data?.data ?? [];
  const [selectedChampionship, setSelectedChampionship] = useState('');

  const { data: standingsData, isLoading: standingsLoading } =
    useChampionshipStandings(selectedChampionship);
  const standings: StandingsEntry[] = standingsData?.data ?? [];

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  if (champsLoading) {
    return <LoadingSpinner className="py-20" size="lg" label="Cargando..." />;
  }

  if (championships.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Sin campeonatos"
        description="No hay campeonatos disponibles. Crea uno para ver la tabla de posiciones."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tabla de Posiciones
          </h1>
          <p className="text-sm text-gray-500">
            Clasificaciones y estadísticas del campeonato
          </p>
        </div>
        <Select
          options={championshipOptions}
          value={selectedChampionship}
          onChange={(e) => setSelectedChampionship(e.target.value)}
          placeholder="Seleccionar campeonato"
          className="w-full sm:w-64"
        />
      </div>

      {!selectedChampionship ? (
        <EmptyState
          icon={Trophy}
          title="Selecciona un campeonato"
          description="Elige un campeonato para ver su tabla de posiciones"
        />
      ) : standingsLoading ? (
        <LoadingSpinner className="py-12" label="Cargando posiciones..." />
      ) : standings.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin datos"
          description="No hay suficientes datos para mostrar la tabla de posiciones"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header w-12">Pos</th>
                <th className="table-header">Equipo</th>
                <th className="table-header text-center">PJ</th>
                <th className="table-header text-center">PG</th>
                <th className="table-header text-center">PE</th>
                <th className="table-header text-center">PP</th>
                <th className="table-header text-center">GF</th>
                <th className="table-header text-center">GC</th>
                <th className="table-header text-center">DG</th>
                <th className="table-header text-center">
                  <div className="flex items-center justify-center gap-1">
                    Pts
                    <span className="group relative inline-flex">
                      <Info className="h-3 w-3 cursor-help text-gray-400" />
                      <span className="absolute -top-2 left-6 z-10 hidden w-48 rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-lg group-hover:block">
                        PJ: Partidos Jugados, PG: Partidos Ganados, PE: Partidos Empatados, PP: Partidos Perdidos, GF: Goles a Favor, GC: Goles en Contra, DG: Diferencia de Gol, Pts: Puntos
                      </span>
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {standings.map((entry, i) => {
                const isTop3 = i < 3;
                return (
                  <tr
                    key={entry.equipoId}
                    className={`transition-colors hover:bg-gray-50 ${
                      isTop3 ? 'bg-yellow-50/40' : ''
                    }`}
                  >
                    <td className="table-cell">
                      <div className="flex items-center justify-center">
                        {i === 0 && (
                          <span className="text-lg" title="1° - Medalla de Oro">
                            🥇
                          </span>
                        )}
                        {i === 1 && (
                          <span className="text-lg" title="2° - Medalla de Plata">
                            🥈
                          </span>
                        )}
                        {i === 2 && (
                          <span className="text-lg" title="3° - Medalla de Bronce">
                            🥉
                          </span>
                        )}
                        {i >= 3 && (
                          <span className="text-sm font-medium text-gray-600">
                            {i + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {entry.escudo ? (
                          <img
                            src={entry.escudo}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                            {entry.equipoNombre.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {entry.equipoNombre}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-center font-medium">
                      {entry.pj}
                    </td>
                    <td className="table-cell text-center text-green-600">
                      {entry.pg}
                    </td>
                    <td className="table-cell text-center text-yellow-600">
                      {entry.pe}
                    </td>
                    <td className="table-cell text-center text-red-600">
                      {entry.pp}
                    </td>
                    <td className="table-cell text-center">{entry.gf}</td>
                    <td className="table-cell text-center">{entry.gc}</td>
                    <td
                      className={`table-cell text-center font-medium ${
                        entry.dg > 0
                          ? 'text-green-600'
                          : entry.dg < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {entry.dg > 0 ? '+' : ''}
                      {entry.dg}
                    </td>
                    <td className="table-cell text-center text-lg font-bold text-primary-600">
                      {entry.puntos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
