'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeams } from '@/hooks/useTeams';
import { useChampionships } from '@/hooks/useChampionship';
import { DataTable } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Shield } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Equipo } from '@/types';

export default function TeamsPage() {
  const router = useRouter();
  const { data: champsData } = useChampionships();
  const championships = champsData?.data?.data ?? [];
  const [selectedChampionship, setSelectedChampionship] = useState<string>('');
  const { data, isLoading, error } = useTeams(selectedChampionship || undefined);
  const teams = data?.data ?? [];

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const columns: ColumnDef<Equipo>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.escudo ? (
            <img
              src={row.original.escudo}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
              <Shield className="h-4 w-4 text-primary-600" />
            </div>
          )}
          <span className="font-medium text-gray-900">{row.original.nombre}</span>
        </div>
      ),
    },
    {
      id: 'categoria',
      header: 'Categoría',
      cell: () => <span className="text-sm text-gray-600">-</span>,
    },
    {
      id: 'temporada',
      header: 'Temporada',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.campeonato?.temporada?.nombre ?? '-'}
        </span>
      ),
    },
    {
      id: 'jugadores',
      header: 'Jugadores',
      cell: ({ row }) => row.original.jugadores?.length ?? 0,
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <StatusBadge status={row.original.activo ? 'ACTIVO' : 'INACTIVO'} />
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/teams/${row.original.id}`);
          }}
        >
          Ver
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <EmptyState
        icon={Shield}
        title="Error al cargar equipos"
        description="Ocurrió un error. Intente nuevamente."
        action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipos</h1>
          <p className="text-sm text-gray-500">
            Gestiona los equipos del campeonato
          </p>
        </div>
        <div className="flex items-center gap-3">
          {championshipOptions.length > 0 && (
            <Select
              options={championshipOptions}
              value={selectedChampionship}
              onChange={(e) => setSelectedChampionship(e.target.value)}
              placeholder="Todos los campeonatos"
              className="w-full sm:w-56"
            />
          )}
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/teams/new')}
          >
            Nuevo Equipo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando equipos..." />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No hay equipos"
          description="Crea tu primer equipo para empezar"
          action={{
            label: 'Nuevo Equipo',
            onClick: () => router.push('/teams/new'),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={teams}
          searchPlaceholder="Buscar equipos..."
          onRowClick={(row) => router.push(`/teams/${row.id}`)}
        />
      )}
    </div>
  );
}
