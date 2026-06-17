'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  ArrowLeft,
  Shield,
  Users,
  UserPlus,
  Calendar,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { Jugador, Delegate, Partido } from '@/types';

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useTeam(id);
  const { data: playersData } = usePlayers(id);
  const team = data?.data;
  const players: Jugador[] = playersData?.data ?? [];

  const playerColumns: ColumnDef<Jugador>[] = [
    {
      id: 'numero',
      header: '#',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.numeroCamiseta ?? '-'}
        </span>
      ),
    },
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
      accessorKey: 'posicion',
      header: 'Posición',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.posicion ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    },
  ];

  const matchHistoryColumns: ColumnDef<Partido>[] = [
    {
      id: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.fecha).toLocaleDateString('es-AR')}
        </span>
      ),
    },
    {
      id: 'rival',
      header: 'Rival',
      cell: ({ row }) => {
        const isLocal = row.original.equipoLocalId === id;
        return (
          <span className="text-sm">
            {isLocal
              ? row.original.equipoVisitante?.nombre ?? '-'
              : row.original.equipoLocal?.nombre ?? '-'}
          </span>
        );
      },
    },
    {
      id: 'resultado',
      header: 'Resultado',
      cell: ({ row }) => {
        const isLocal = row.original.equipoLocalId === id;
        const golesFavor = isLocal
          ? row.original.golesLocal
          : row.original.golesVisitante;
        const golesContra = isLocal
          ? row.original.golesVisitante
          : row.original.golesLocal;
        const isWin =
          row.original.estado === 'FINALIZADO' && golesFavor != null && golesContra != null
            ? golesFavor > golesContra
            : null;
        return row.original.estado === 'FINALIZADO' ? (
          <span
            className={`font-medium ${
              isWin === null
                ? 'text-gray-500'
                : isWin
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {golesFavor ?? '-'} - {golesContra ?? '-'}
          </span>
        ) : (
          <StatusBadge status={row.original.estado} />
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <LoadingSpinner className="py-20" size="lg" label="Cargando equipo..." />
    );
  }

  if (error || !team) {
    return (
      <EmptyState
        icon={Shield}
        title="Equipo no encontrado"
        description="El equipo que buscas no existe."
        action={{ label: 'Volver', onClick: () => router.push('/teams') }}
      />
    );
  }

  const wins =
    team.partidosLocal?.filter(
      (p) => p.estado === 'FINALIZADO' && (p.golesLocal ?? 0) > (p.golesVisitante ?? 0),
    ).length ?? 0;
  const losses =
    team.partidosLocal?.filter(
      (p) => p.estado === 'FINALIZADO' && (p.golesLocal ?? 0) < (p.golesVisitante ?? 0),
    ).length ?? 0;
  const draws =
    team.partidosLocal?.filter(
      (p) => p.estado === 'FINALIZADO' && (p.golesLocal ?? 0) === (p.golesVisitante ?? 0),
    ).length ?? 0;
  const goalsFor =
    team.partidosLocal?.reduce(
      (acc, p) => acc + (p.golesLocal ?? 0),
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/teams')}
          className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-start gap-4">
          {team.escudo ? (
            <img
              src={team.escudo}
              alt={team.nombre}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {team.nombre}
              </h1>
              <StatusBadge status={team.activo ? 'ACTIVO' : 'INACTIVO'} />
            </div>
            <div className="mt-1 flex items-center gap-3">
              {team.colorPrincipal && (
                <span
                  className="inline-block h-4 w-4 rounded-full border"
                  style={{ backgroundColor: team.colorPrincipal }}
                />
              )}
              {team.colorSecundario && (
                <span
                  className="inline-block h-4 w-4 rounded-full border"
                  style={{ backgroundColor: team.colorSecundario }}
                />
              )}
              <span className="text-sm text-gray-500">
                {team.campeonato?.nombre ?? 'Sin campeonato'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{wins}</p>
          <p className="text-sm text-gray-500">Victorias</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-600">{losses}</p>
          <p className="text-sm text-gray-500">Derrotas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{draws}</p>
          <p className="text-sm text-gray-500">Empates</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{goalsFor}</p>
          <p className="text-sm text-gray-500">Goles</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Información del Equipo
          </h3>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-gray-500">Nombre Corto</dt>
              <dd className="font-medium text-gray-900">{team.nombre}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Campeonato</dt>
              <dd className="font-medium text-gray-900">
                {team.campeonato?.nombre ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <StatusBadge status={team.activo ? 'ACTIVO' : 'INACTIVO'} />
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Jugadores ({players.length})
          </h3>
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            size="sm"
            onClick={() => router.push(`/players?equipoId=${id}`)}
          >
            Agregar Jugador
          </Button>
        </CardHeader>
        {players.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin jugadores"
            description="No hay jugadores registrados en este equipo"
            action={{
              label: 'Agregar Jugador',
              onClick: () => router.push(`/players?equipoId=${id}`),
            }}
          />
        ) : (
          <DataTable
            columns={playerColumns}
            data={players}
            pagination={false}
            searchable={false}
          />
        )}
      </Card>

      {team.delegados && team.delegados.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Delegados ({team.delegados.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="divide-y divide-gray-100">
              {team.delegados.map((delegate) => (
                <div
                  key={delegate.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {delegate.nombre} {delegate.apellido}
                    </p>
                    <p className="text-sm text-gray-500">
                      {delegate.cargo}
                      {delegate.email && ` - ${delegate.email}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Historial de Partidos
          </h3>
        </CardHeader>
        {(!team.partidosLocal || team.partidosLocal.length === 0) &&
        (!team.partidosVisitante || team.partidosVisitante.length === 0) ? (
          <EmptyState
            icon={Calendar}
            title="Sin partidos"
            description="Este equipo no tiene partidos registrados"
          />
        ) : (
          <DataTable
            columns={matchHistoryColumns}
            data={[
              ...(team.partidosLocal ?? []),
              ...(team.partidosVisitante ?? []),
            ].sort(
              (a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
            )}
            pagination={false}
            searchable={false}
          />
        )}
      </Card>
    </div>
  );
}
