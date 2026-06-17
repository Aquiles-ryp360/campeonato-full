'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChampionships } from '@/hooks/useChampionship';
import { DataTable } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';
import { Plus, Trophy, Search } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Campeonato } from '@/types';

const typeBadgeVariant: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  LIGA: 'success',
  COPA: 'info',
  TORNEO: 'warning',
  AMISTOSO: 'default',
};

const typeLabels: Record<string, string> = {
  LIGA: 'Liga',
  COPA: 'Copa',
  TORNEO: 'Torneo',
  AMISTOSO: 'Amistoso',
};

export default function ChampionshipsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useChampionships({ search });
  const championships = data?.data?.data ?? [];

  const columns: ColumnDef<Campeonato>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.nombre}</span>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant={typeBadgeVariant[row.original.tipo] ?? 'default'}>
          {typeLabels[row.original.tipo] ?? row.original.tipo}
        </Badge>
      ),
    },
    {
      accessorKey: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => row.original.categoria?.nombre ?? '-',
    },
    {
      id: 'fechas',
      header: 'Fechas',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.original.fechaInicio)}
          {row.original.fechaFin ? ` - ${formatDate(row.original.fechaFin)}` : ''}
        </span>
      ),
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'success' : 'default'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'equipos',
      header: 'Equipos',
      cell: ({ row }) => row.original.equipos?.length ?? 0,
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
            router.push(`/championships/${row.original.id}`);
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
        icon={Trophy}
        title="Error al cargar campeonatos"
        description="Ocurrió un error al obtener los datos. Intente nuevamente."
        action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campeonatos</h1>
          <p className="text-sm text-gray-500">
            Gestiona tus campeonatos deportivos
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/championships/new')}
        >
          Nuevo Campeonato
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando campeonatos..." />
      ) : championships.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hay campeonatos"
          description="Crea tu primer campeonato para empezar"
          action={{
            label: 'Nuevo Campeonato',
            onClick: () => router.push('/championships/new'),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={championships}
          searchPlaceholder="Buscar campeonatos..."
          onRowClick={(row) => router.push(`/championships/${row.id}`)}
        />
      )}
    </div>
  );
}
