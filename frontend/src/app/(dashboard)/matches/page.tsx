'use client';

import { useState, useMemo } from 'react';
import { useMatches, useUpdateResult } from '@/hooks/useMatches';
import { useChampionships } from '@/hooks/useChampionship';
import { useTeams } from '@/hooks/useTeams';
import { DataTable } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDateTime } from '@/lib/utils';
import { Calendar, Shield, Edit3 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Partido } from '@/types';
import toast from 'react-hot-toast';

export default function MatchesPage() {
  const { data: champsData } = useChampionships();
  const championships = champsData?.data?.data ?? [];

  const [champFilter, setChampFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Partido | null>(null);
  const [golesLocal, setGolesLocal] = useState('');
  const [golesVisitante, setGolesVisitante] = useState('');

  const { data: teamsData } = useTeams(champFilter || undefined);
  const teams = teamsData?.data ?? [];

  const { data, isLoading, error } = useMatches({
    campeonatoId: champFilter || undefined,
    estado: statusFilter || undefined,
    equipoId: teamFilter || undefined,
    limit: 200,
  });
  const updateResult = useUpdateResult();

  const matches: Partido[] = data?.data?.data ?? [];

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const teamOptions = teams.map((t) => ({ label: t.nombre, value: t.id }));

  const columns: ColumnDef<Partido>[] = [
    {
      id: 'jornada',
      header: 'Jornada',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          J{row.original.fixture?.jornada ?? '-'}
        </span>
      ),
    },
    {
      id: 'local',
      header: 'Local',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.equipoLocal?.escudo ? (
            <img
              src={row.original.equipoLocal.escudo}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <Shield className="h-5 w-5 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900">
            {row.original.equipoLocal?.nombre ?? '-'}
          </span>
        </div>
      ),
    },
    {
      id: 'vs',
      header: '',
      cell: () => <span className="text-sm text-gray-400">vs</span>,
    },
    {
      id: 'visitante',
      header: 'Visitante',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.equipoVisitante?.escudo ? (
            <img
              src={row.original.equipoVisitante.escudo}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <Shield className="h-5 w-5 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900">
            {row.original.equipoVisitante?.nombre ?? '-'}
          </span>
        </div>
      ),
    },
    {
      id: 'resultado',
      header: 'Resultado',
      cell: ({ row }) => {
        const isFinished = row.original.estado === 'FINALIZADO';
        return (
          <span
            className={`text-sm font-bold ${
              isFinished ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {isFinished
              ? `${row.original.golesLocal ?? 0} - ${row.original.golesVisitante ?? 0}`
              : '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'cancha',
      header: 'Cancha',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.cancha?.nombre ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha/Hora',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {formatDateTime(row.original.fecha)}
        </span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} />
      ),
    },
    {
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Edit3 className="h-3 w-3" />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMatch(row.original);
            setGolesLocal(String(row.original.golesLocal ?? ''));
            setGolesVisitante(String(row.original.golesVisitante ?? ''));
            setEditModalOpen(true);
          }}
        >
          Resultado
        </Button>
      ),
    },
  ];

  const getRowClassName = (match: Partido) => {
    switch (match.estado) {
      case 'FINALIZADO':
        return 'bg-green-50/30';
      case 'EN_CURSO':
        return 'bg-blue-50/30';
      case 'SUSPENDIDO':
        return 'bg-red-50/30';
      default:
        return '';
    }
  };

  const handleSaveResult = async () => {
    if (!selectedMatch) return;
    try {
      await updateResult.mutateAsync({
        id: selectedMatch.id,
        data: {
          golesLocal: Number(golesLocal),
          golesVisitante: Number(golesVisitante),
          estado: 'FINALIZADO',
        },
      });
      toast.success('Resultado actualizado');
      setEditModalOpen(false);
      setSelectedMatch(null);
    } catch {
      toast.error('Error al actualizar el resultado');
    }
  };

  if (error) {
    return (
      <EmptyState
        icon={Calendar}
        title="Error al cargar partidos"
        description="Ocurrió un error. Intente nuevamente."
        action={{ label: 'Reintentar', onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <p className="text-sm text-gray-500">
            Gestiona los partidos del campeonato
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={championshipOptions}
          value={champFilter}
          onChange={(e) => setChampFilter(e.target.value)}
          placeholder="Todos los campeonatos"
          className="w-full sm:w-48"
        />
        <Select
          options={teamOptions}
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          placeholder="Todos los equipos"
          className="w-full sm:w-44"
        />
        <Select
          options={[
            { label: 'Todos los estados', value: '' },
            { label: 'Programados', value: 'PROGRAMADO' },
            { label: 'En Curso', value: 'EN_CURSO' },
            { label: 'Finalizados', value: 'FINALIZADO' },
            { label: 'Suspendidos', value: 'SUSPENDIDO' },
            { label: 'Aplazados', value: 'APLAZADO' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Estado"
          className="w-full sm:w-36"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando partidos..." />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hay partidos"
          description="No hay partidos que coincidan con los filtros seleccionados"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Jornada',
                  'Local',
                  '',
                  'Visitante',
                  'Resultado',
                  'Cancha',
                  'Fecha/Hora',
                  'Estado',
                  '',
                ].map((h) => (
                  <th key={h} className="table-header">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {matches.map((match) => (
                <tr
                  key={match.id}
                  className={`transition-colors hover:bg-gray-50 ${getRowClassName(match)}`}
                >
                  <td className="table-cell text-sm font-medium">
                    J{match.fixture?.jornada ?? '-'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {match.equipoLocal?.escudo ? (
                        <img
                          src={match.equipoLocal.escudo}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <Shield className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {match.equipoLocal?.nombre ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-gray-400">vs</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {match.equipoVisitante?.escudo ? (
                        <img
                          src={match.equipoVisitante.escudo}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <Shield className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {match.equipoVisitante?.nombre ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`text-sm font-bold ${
                        match.estado === 'FINALIZADO'
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {match.estado === 'FINALIZADO'
                        ? `${match.golesLocal ?? 0} - ${match.golesVisitante ?? 0}`
                        : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {match.cancha?.nombre ?? '-'}
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {formatDateTime(match.fecha)}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={match.estado} />
                  </td>
                  <td className="table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit3 className="h-3 w-3" />}
                      onClick={() => {
                        setSelectedMatch(match);
                        setGolesLocal(String(match.golesLocal ?? ''));
                        setGolesVisitante(String(match.golesVisitante ?? ''));
                        setEditModalOpen(true);
                      }}
                    >
                      Resultado
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Resultado"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveResult} isLoading={updateResult.isPending}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedMatch && (
            <div className="text-center">
              <p className="font-medium text-gray-900">
                {selectedMatch.equipoLocal?.nombre ?? 'Local'} vs{' '}
                {selectedMatch.equipoVisitante?.nombre ?? 'Visitante'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Input
              label="Goles Local"
              type="number"
              min={0}
              value={golesLocal}
              onChange={(e) => setGolesLocal(e.target.value)}
            />
            <span className="mt-6 text-gray-400">-</span>
            <Input
              label="Goles Visitante"
              type="number"
              min={0}
              value={golesVisitante}
              onChange={(e) => setGolesVisitante(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
