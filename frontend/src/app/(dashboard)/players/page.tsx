'use client';

import { useState, useMemo } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useChampionships } from '@/hooks/useChampionship';
import { DataTable } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SearchInput } from '@/components/ui/search-input';
import { Users, Plus, User } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Jugador } from '@/types';

const POSITION_OPTIONS = [
  { label: 'Todas las posiciones', value: '' },
  { label: 'Arquero', value: 'Arquero' },
  { label: 'Defensor', value: 'Defensor' },
  { label: 'Mediocampista', value: 'Mediocampista' },
  { label: 'Delantero', value: 'Delantero' },
];

export default function PlayersPage() {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: champsData } = useChampionships();
  const championships = champsData?.data?.data ?? [];
  const [champFilter, setChampFilter] = useState('');

  const { data: teamsData } = useTeams(champFilter || undefined);
  const teams = teamsData?.data ?? [];
  const { data, isLoading, error } = usePlayers();
  const allPlayers: Jugador[] = data?.data ?? [];

  const teamOptions = teams.map((t) => ({ label: t.nombre, value: t.id }));
  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((player) => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${player.nombre} ${player.apellido}`.toLowerCase();
        const doc = player.dni?.toLowerCase() ?? '';
        if (!fullName.includes(q) && !doc.includes(q)) return false;
      }
      if (teamFilter && player.equipoId !== teamFilter) return false;
      if (positionFilter && player.posicion !== positionFilter) return false;
      if (statusFilter && player.estado !== statusFilter) return false;
      if (champFilter && player.equipo?.campeonatoId !== champFilter)
        return false;
      return true;
    });
  }, [allPlayers, search, teamFilter, positionFilter, statusFilter, champFilter]);

  const columns: ColumnDef<Jugador>[] = [
    {
      id: 'foto',
      header: 'Foto',
      cell: ({ row }) =>
        row.original.foto ? (
          <img
            src={row.original.foto}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
            {row.original.nombre.charAt(0)}
            {row.original.apellido.charAt(0)}
          </div>
        ),
    },
    {
      id: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.nombre} {row.original.apellido}
        </span>
      ),
    },
    {
      accessorKey: 'dni',
      header: 'Documento',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.dni ?? '-'}
        </span>
      ),
    },
    {
      id: 'equipo',
      header: 'Equipo',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.equipo?.nombre ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'numeroCamiseta',
      header: 'Número',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.numeroCamiseta ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'posicion',
      header: 'Posición',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.posicion ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    },
  ];

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Error al cargar jugadores"
        description="Ocurrió un error. Intente nuevamente."
        action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
          <p className="text-sm text-gray-500">
            Gestiona los jugadores registrados
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o documento..."
          className="w-full sm:w-64"
        />
        <Select
          options={championshipOptions}
          value={champFilter}
          onChange={(e) => setChampFilter(e.target.value)}
          placeholder="Campeonato"
          className="w-full sm:w-44"
        />
        <Select
          options={teamOptions}
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          placeholder="Equipo"
          className="w-full sm:w-44"
        />
        <Select
          options={POSITION_OPTIONS}
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          placeholder="Posición"
          className="w-full sm:w-40"
        />
        <Select
          options={[
            { label: 'Todos los estados', value: '' },
            { label: 'Activo', value: 'ACTIVO' },
            { label: 'Lesionado', value: 'LESIONADO' },
            { label: 'Suspendido', value: 'SUSPENDIDO' },
            { label: 'Inactivo', value: 'INACTIVO' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Estado"
          className="w-full sm:w-36"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando jugadores..." />
      ) : filteredPlayers.length === 0 ? (
        <EmptyState
          icon={User}
          title="No se encontraron jugadores"
          description="No hay jugadores que coincidan con los filtros seleccionados"
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredPlayers}
          searchable={false}
          pageSize={15}
        />
      )}
    </div>
  );
}
