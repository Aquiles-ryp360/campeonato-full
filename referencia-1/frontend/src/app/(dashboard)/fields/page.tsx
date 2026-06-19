'use client';

import { useState } from 'react';
import { useMatches } from '@/hooks/useMatches';
import { DataTable } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, MapPin, Users, Calendar } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import type { Cancha, Partido } from '@/types';

interface CanchaWithMatches extends Cancha {
  matches?: Partido[];
}

export default function FieldsPage() {
  const { data: matchesData, isLoading: matchesLoading } = useMatches({ limit: 500 });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const allMatches: Partido[] = matchesData?.data?.data ?? [];

  const canchasMap = new Map<string, CanchaWithMatches>();
  for (const match of allMatches) {
    if (!match.cancha) continue;
    const existing = canchasMap.get(match.cancha.id);
    if (existing) {
      existing.matches = existing.matches ?? [];
      existing.matches.push(match);
    } else {
      canchasMap.set(match.cancha.id, {
        ...match.cancha,
        matches: [match],
      });
    }
  }

  const canchas = Array.from(canchasMap.values());

  const columns: ColumnDef<CanchaWithMatches>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.nombre}</span>
      ),
    },
    {
      accessorKey: 'direccion',
      header: 'Ubicación',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {[row.original.direccion, row.original.ciudad]
              .filter(Boolean)
              .join(', ') || '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'capacidad',
      header: 'Capacidad',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.capacidad ?? '-'}</span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const hasMatchToday = (row.original.matches ?? []).some(
          (m) =>
            new Date(m.fecha).toISOString().split('T')[0] === selectedDate &&
            m.estado !== 'FINALIZADO',
        );
        return (
          <Badge variant={hasMatchToday ? 'warning' : 'success'}>
            {hasMatchToday ? 'Ocupado' : 'Disponible'}
          </Badge>
        );
      },
    },
    {
      id: 'partidos',
      header: 'Partidos Asignados',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.matches?.length ?? 0}</span>
      ),
    },
  ];

  if (matchesLoading) {
    return (
      <LoadingSpinner className="py-12" label="Cargando canchas..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canchas</h1>
          <p className="text-sm text-gray-500">
            Gestiona las canchas disponibles
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Nueva Cancha
        </Button>
      </div>

      {canchas.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No hay canchas"
          description="No hay canchas registradas en el sistema"
          action={{ label: 'Nueva Cancha', onClick: () => {} }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={canchas}
            searchable
            searchPlaceholder="Buscar canchas..."
            pagination={false}
          />

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Disponibilidad - {formatDate(selectedDate)}
              </h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field w-auto text-sm"
              />
            </CardHeader>
            {canchas.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-gray-500">
                No hay canchas disponibles
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3">
                {canchas.map((cancha) => {
                  const dayMatches = (cancha.matches ?? []).filter(
                    (m) =>
                      new Date(m.fecha).toISOString().split('T')[0] ===
                      selectedDate,
                  );
                  const isBusy = dayMatches.some(
                    (m) => m.estado !== 'FINALIZADO',
                  );
                  return (
                    <div
                      key={cancha.id}
                      className={`rounded-lg border p-4 ${
                        isBusy
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {cancha.nombre}
                        </p>
                        <Badge variant={isBusy ? 'warning' : 'success'}>
                          {isBusy ? 'Ocupado' : 'Disponible'}
                        </Badge>
                      </div>
                      {dayMatches.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {dayMatches.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <Calendar className="h-3 w-3" />
                              <span>
                                {m.equipoLocal?.nombre ?? '-'} vs{' '}
                                {m.equipoVisitante?.nombre ?? '-'}
                              </span>
                              <StatusBadge status={m.estado} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    PROGRAMADO: { label: 'Programado', variant: 'info' },
    EN_CURSO: { label: 'En Curso', variant: 'warning' },
    FINALIZADO: { label: 'Finalizado', variant: 'success' },
    SUSPENDIDO: { label: 'Suspendido', variant: 'danger' },
    APLAZADO: { label: 'Aplazado', variant: 'warning' },
    PENDIENTE: { label: 'Pendiente', variant: 'info' },
  };
  const c = config[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
