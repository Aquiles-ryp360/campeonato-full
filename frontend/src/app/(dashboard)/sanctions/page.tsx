'use client';

import { useState, useMemo } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { useChampionships } from '@/hooks/useChampionship';
import { useTeams } from '@/hooks/useTeams';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SearchInput } from '@/components/ui/search-input';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  Plus,
  Shield,
  Gavel,
  Ban,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Jugador, Sancion } from '@/types';
import toast from 'react-hot-toast';

export default function SanctionsPage() {
  const { data: champsData } = useChampionships();
  const championships = champsData?.data?.data ?? [];
  const [champFilter, setChampFilter] = useState('');
  const { data: teamsData } = useTeams(champFilter || undefined);
  const teams = teamsData?.data ?? [];
  const [teamFilter, setTeamFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerForSanction, setSelectedPlayerForSanction] =
    useState<Jugador | null>(null);
  const [newSanctionOpen, setNewSanctionOpen] = useState(false);
  const [sanctionForm, setSanctionForm] = useState({
    motivo: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: '',
    partidosSuspension: '',
  });

  const { data: playersData, isLoading } = usePlayers();
  const allPlayers: Jugador[] = playersData?.data ?? [];

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      if (champFilter && p.equipo?.campeonatoId !== champFilter) return false;
      if (teamFilter && p.equipoId !== teamFilter) return false;
      if (playerSearch) {
        const q = playerSearch.toLowerCase();
        const name = `${p.nombre} ${p.apellido}`.toLowerCase();
        if (!name.includes(q) && !(p.dni ?? '').toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [allPlayers, champFilter, teamFilter, playerSearch]);

  const sanctions: (Sancion & { jugador?: Jugador })[] = useMemo(() => {
    const result: (Sancion & { jugador?: Jugador })[] = [];
    for (const player of filteredPlayers) {
      if (player.sanciones) {
        for (const s of player.sanciones) {
          result.push({ ...s, jugador: player });
        }
      }
    }
    return result.sort(
      (a, b) =>
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime(),
    );
  }, [filteredPlayers]);

  const filteredSanctions = useMemo(() => {
    if (!typeFilter) return sanctions;
    return sanctions.filter((s) => {
      if (typeFilter === 'activas') return s.activa;
      if (typeFilter === 'expiradas') return !s.activa;
      return true;
    });
  }, [sanctions, typeFilter]);

  const activeSanctions = sanctions.filter((s) => s.activa).length;
  const suspendedPlayers = new Set(
    filteredPlayers.filter((p) => p.estado === 'SUSPENDIDO').map((p) => p.id),
  ).size;

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const teamOptions = teams.map((t) => ({ label: t.nombre, value: t.id }));

  const typeOptions = [
    { label: 'Todas las sanciones', value: '' },
    { label: 'Activas', value: 'activas' },
    { label: 'Expiradas', value: 'expiradas' },
  ];

  const columns: ColumnDef<Sancion & { jugador?: Jugador }>[] = [
    {
      id: 'jugador',
      header: 'Jugador',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.jugador
            ? `${row.original.jugador.nombre} ${row.original.jugador.apellido}`
            : '-'}
        </span>
      ),
    },
    {
      id: 'equipo',
      header: 'Equipo',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.jugador?.equipo?.nombre ?? '-'}
        </span>
      ),
    },
    {
      id: 'tipo',
      header: 'Tipo de Sanción',
      cell: () => (
        <Badge variant="danger">Suspensión</Badge>
      ),
    },
    {
      accessorKey: 'motivo',
      header: 'Motivo',
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-sm text-gray-600">
          {row.original.motivo}
        </span>
      ),
    },
    {
      accessorKey: 'fechaInicio',
      header: 'Fecha Inicio',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.fechaInicio)}</span>
      ),
    },
    {
      accessorKey: 'fechaFin',
      header: 'Fecha Fin',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.fechaFin ? formatDate(row.original.fechaFin) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'activa',
      header: 'Estado',
      cell: ({ row }) => (
        <StatusBadge status={row.original.activa ? 'ACTIVO' : 'INACTIVO'} />
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner className="py-12" label="Cargando sanciones..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sanciones</h1>
          <p className="text-sm text-gray-500">
            Gestión de sanciones y suspensiones
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setNewSanctionOpen(true)}
        >
          Nueva Sanción
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-red-600">{activeSanctions}</p>
            <p className="text-sm text-gray-500">Sanciones Activas</p>
          </CardBody>
        </Card>
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-yellow-600">
              {suspendedPlayers}
            </p>
            <p className="text-sm text-gray-500">Jugadores Suspendidos</p>
          </CardBody>
        </Card>
        <Card className="text-center">
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-gray-900">
              {sanctions.length}
            </p>
            <p className="text-sm text-gray-500">Total Sanciones</p>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
          options={typeOptions}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="Tipo"
          className="w-full sm:w-36"
        />
        <SearchInput
          value={playerSearch}
          onChange={setPlayerSearch}
          placeholder="Buscar jugador..."
          className="w-full sm:w-56"
        />
      </div>

      {filteredSanctions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Sin sanciones"
          description="No hay sanciones registradas que coincidan con los filtros"
          action={{
            label: 'Nueva Sanción',
            onClick: () => setNewSanctionOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSanctions}
          searchable={false}
          pagination
          pageSize={15}
        />
      )}

      <Modal
        isOpen={newSanctionOpen}
        onClose={() => setNewSanctionOpen(false)}
        title="Nueva Sanción"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setNewSanctionOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success('Sanción creada exitosamente');
                setNewSanctionOpen(false);
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Jugador"
            options={filteredPlayers.map((p) => ({
              label: `${p.nombre} ${p.apellido}${p.equipo ? ` (${p.equipo.nombre})` : ''}`,
              value: p.id,
            }))}
            value={selectedPlayerForSanction?.id ?? ''}
            onChange={(e) => {
              const player = filteredPlayers.find(
                (p) => p.id === e.target.value,
              );
              setSelectedPlayerForSanction(player ?? null);
            }}
            placeholder="Seleccionar jugador..."
          />
          <Input
            label="Motivo"
            value={sanctionForm.motivo}
            onChange={(e) =>
              setSanctionForm((prev) => ({ ...prev, motivo: e.target.value }))
            }
            placeholder="Descripción de la sanción"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={sanctionForm.fechaInicio}
              onChange={(e) =>
                setSanctionForm((prev) => ({
                  ...prev,
                  fechaInicio: e.target.value,
                }))
              }
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={sanctionForm.fechaFin}
              onChange={(e) =>
                setSanctionForm((prev) => ({
                  ...prev,
                  fechaFin: e.target.value,
                }))
              }
            />
          </div>
          <Input
            label="Partidos de Suspensión"
            type="number"
            min={0}
            value={sanctionForm.partidosSuspension}
            onChange={(e) =>
              setSanctionForm((prev) => ({
                ...prev,
                partidosSuspension: e.target.value,
              }))
            }
          />
        </div>
      </Modal>
    </div>
  );
}
