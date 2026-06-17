'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  useChampionship,
  useChampionshipStandings,
  useChampionshipStats,
  useChampionships,
} from '@/hooks/useChampionship';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { useMatches } from '@/hooks/useMatches';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StandingsChart } from '@/components/charts/standings-chart';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  Shield,
  Users,
  Calendar,
  Trophy,
  FileText,
  Download,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { type ColumnDef as ColumnDefImport } from '@tanstack/react-table';
import type {
  Campeonato,
  Equipo,
  Jugador,
  Partido,
  StandingsEntry,
  Fixture,
} from '@/types';

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

type TabId =
  | 'informacion'
  | 'equipos'
  | 'fixture'
  | 'posiciones'
  | 'partidos'
  | 'reportes';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const tabs: Tab[] = [
  { id: 'informacion', label: 'Información', icon: Trophy },
  { id: 'equipos', label: 'Equipos', icon: Shield },
  { id: 'fixture', label: 'Fixture', icon: Calendar },
  { id: 'posiciones', label: 'Tabla de Posiciones', icon: BarChart3 },
  { id: 'partidos', label: 'Partidos', icon: Calendar },
  { id: 'reportes', label: 'Reportes', icon: FileText },
];

export default function ChampionshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('informacion');
  const [matchFilters, setMatchFilters] = useState<{
    fixtureId?: string;
    estado?: string;
  }>({});

  const { data: champData, isLoading: champLoading, error: champError } = useChampionship(id);
  const { data: standingsData, isLoading: standingsLoading } = useChampionshipStandings(id);
  const { data: statsData } = useChampionshipStats(id);
  const { data: teamsData, isLoading: teamsLoading } = useTeams(id);
  const { data: matchesData, isLoading: matchesLoading } = useMatches({
    campeonatoId: id,
    ...matchFilters,
  });
  const { data: playersData } = usePlayers();

  const championship = champData?.data;
  const standings: StandingsEntry[] = standingsData?.data ?? [];
  const teams: Equipo[] = teamsData?.data ?? [];
  const matches: Partido[] = matchesData?.data?.data ?? [];
  const stats = statsData?.data;
  const fixtures = championship?.fixtures ?? [];

  const teamColumns: ColumnDef<Equipo>[] = [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.escudo && (
            <img
              src={row.original.escudo}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          )}
          <span className="font-medium text-gray-900">{row.original.nombre}</span>
        </div>
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
  ];

  const matchColumns: ColumnDef<Partido>[] = [
    {
      accessorKey: 'jornada',
      header: 'Jornada',
      cell: ({ row }) => (
        <span className="text-sm">J{row.original.fixture?.jornada ?? '-'}</span>
      ),
    },
    {
      id: 'local',
      header: 'Local',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.equipoLocal?.escudo && (
            <img
              src={row.original.equipoLocal.escudo}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className="text-sm">{row.original.equipoLocal?.nombre ?? '-'}</span>
        </div>
      ),
    },
    {
      id: 'resultado',
      header: 'Resultado',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.estado === 'FINALIZADO'
            ? `${row.original.golesLocal ?? 0} - ${row.original.golesVisitante ?? 0}`
            : 'vs'}
        </span>
      ),
    },
    {
      id: 'visitante',
      header: 'Visitante',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.equipoVisitante?.escudo && (
            <img
              src={row.original.equipoVisitante.escudo}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className="text-sm">{row.original.equipoVisitante?.nombre ?? '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {formatDateTime(row.original.fecha)}
        </span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.estado} />,
    },
  ];

  if (champLoading) {
    return <LoadingSpinner className="py-20" size="lg" label="Cargando campeonato..." />;
  }

  if (champError || !championship) {
    return (
      <EmptyState
        icon={Trophy}
        title="Campeonato no encontrado"
        description="El campeonato que buscas no existe o ha sido eliminado."
        action={{ label: 'Volver', onClick: () => router.push('/championships') }}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'informacion':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Campeonato
                </h3>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-sm text-gray-500">Nombre</dt>
                    <dd className="font-medium text-gray-900">{championship.nombre}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Tipo</dt>
                    <dd>
                      <Badge variant={typeBadgeVariant[championship.tipo] ?? 'default'}>
                        {typeLabels[championship.tipo] ?? championship.tipo}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Estado</dt>
                    <dd>
                      <StatusBadge status={championship.activo ? 'ACTIVO' : 'INACTIVO'} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Categoría</dt>
                    <dd className="font-medium text-gray-900">
                      {championship.categoria?.nombre ?? '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Temporada</dt>
                    <dd className="font-medium text-gray-900">
                      {championship.temporada?.nombre ?? '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Fecha Inicio</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDate(championship.fechaInicio)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Fecha Fin</dt>
                    <dd className="font-medium text-gray-900">
                      {championship.fechaFin ? formatDate(championship.fechaFin) : '-'}
                    </dd>
                  </div>
                  {championship.descripcion && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-sm text-gray-500">Descripción</dt>
                      <dd className="text-gray-900">{championship.descripcion}</dd>
                    </div>
                  )}
                </dl>
                {stats && (
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.totalEquipos}</p>
                      <p className="text-sm text-gray-500">Equipos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.totalJugadores}</p>
                      <p className="text-sm text-gray-500">Jugadores</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.partidosJugados}</p>
                      <p className="text-sm text-gray-500">Jugados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.partidosPendientes}</p>
                      <p className="text-sm text-gray-500">Pendientes</p>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        );

      case 'equipos':
        return (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Equipos Registrados ({teams.length})
              </h3>
            </CardHeader>
            {teamsLoading ? (
              <LoadingSpinner className="py-8" label="Cargando equipos..." />
            ) : teams.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="Sin equipos"
                description="No hay equipos registrados en este campeonato"
              />
            ) : (
              <DataTable
                columns={teamColumns}
                data={teams}
                pagination={false}
                searchable={false}
              />
            )}
          </Card>
        );

      case 'fixture':
        return (
          <div className="space-y-6">
            {fixtures.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin fixture"
                description="No se ha generado el fixture para este campeonato"
              />
            ) : (
              fixtures.map((fixture) => (
                <Card key={fixture.id}>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {fixture.nombre} - Jornada {fixture.jornada}
                    </h3>
                    <Badge variant={fixture.completado ? 'success' : 'warning'}>
                      {fixture.completado ? 'Completado' : 'Pendiente'}
                    </Badge>
                  </CardHeader>
                  {fixture.partidos && fixture.partidos.length > 0 ? (
                    <DataTable
                      columns={matchColumns}
                      data={fixture.partidos}
                      pagination={false}
                      searchable={false}
                    />
                  ) : (
                    <p className="px-6 pb-4 text-sm text-gray-500">
                      No hay partidos en esta jornada
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        );

      case 'posiciones':
        return (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Tabla de Posiciones
              </h3>
            </CardHeader>
            {standingsLoading ? (
              <LoadingSpinner className="py-8" label="Cargando posiciones..." />
            ) : standings.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Sin datos"
                description="No hay datos de posiciones disponibles"
              />
            ) : (
              <>
                <StandingsChart data={standings} />
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-header">Pos</th>
                        <th className="table-header">Equipo</th>
                        <th className="table-header">PJ</th>
                        <th className="table-header">PG</th>
                        <th className="table-header">PE</th>
                        <th className="table-header">PP</th>
                        <th className="table-header">GF</th>
                        <th className="table-header">GC</th>
                        <th className="table-header">DG</th>
                        <th className="table-header">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {standings.map((entry, i) => (
                        <tr
                          key={entry.equipoId}
                          className={`transition-colors hover:bg-gray-50 ${
                            i < 3 ? 'bg-green-50/50' : ''
                          }`}
                        >
                          <td className="table-cell font-medium">
                            {i === 0 && '🥇'}
                            {i === 1 && '🥈'}
                            {i === 2 && '🥉'}
                            {i >= 3 && i + 1}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {entry.escudo && (
                                <img
                                  src={entry.escudo}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              )}
                              <span className="font-medium text-gray-900">
                                {entry.equipoNombre}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">{entry.pj}</td>
                          <td className="table-cell">{entry.pg}</td>
                          <td className="table-cell">{entry.pe}</td>
                          <td className="table-cell">{entry.pp}</td>
                          <td className="table-cell">{entry.gf}</td>
                          <td className="table-cell">{entry.gc}</td>
                          <td className="table-cell font-medium">{entry.dg}</td>
                          <td className="table-cell font-bold text-primary-600">
                            {entry.puntos}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        );

      case 'partidos':
        return (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Partidos
              </h3>
              <div className="flex gap-2">
                <select
                  className="input-field text-sm"
                  value={matchFilters.fixtureId ?? ''}
                  onChange={(e) =>
                    setMatchFilters((prev) => ({
                      ...prev,
                      fixtureId: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">Todas las jornadas</option>
                  {fixtures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
                <select
                  className="input-field text-sm"
                  value={matchFilters.estado ?? ''}
                  onChange={(e) =>
                    setMatchFilters((prev) => ({
                      ...prev,
                      estado: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">Todos los estados</option>
                  <option value="PROGRAMADO">Programados</option>
                  <option value="EN_CURSO">En Curso</option>
                  <option value="FINALIZADO">Finalizados</option>
                  <option value="SUSPENDIDO">Suspendidos</option>
                </select>
              </div>
            </CardHeader>
            {matchesLoading ? (
              <LoadingSpinner className="py-8" label="Cargando partidos..." />
            ) : matches.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin partidos"
                description="No hay partidos registrados"
              />
            ) : (
              <DataTable
                columns={matchColumns}
                data={matches}
                searchable={false}
                pagination={false}
              />
            )}
          </Card>
        );

      case 'reportes':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Fixture Completo', icon: Calendar },
              { label: 'Cronograma', icon: Calendar },
              { label: 'Tabla de Posiciones', icon: BarChart3 },
              { label: 'Lista de Jugadores', icon: Users },
              { label: 'Lista de Sancionados', icon: Trophy },
            ].map((report) => (
              <Card key={report.label} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
                  <report.icon className="h-10 w-10 text-primary-600" />
                  <h4 className="font-semibold text-gray-900">{report.label}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" leftIcon={<Download className="h-3 w-3" />}>
                      PDF
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<Download className="h-3 w-3" />}>
                      Excel
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/championships')}
            className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {championship.nombre}
              </h1>
              <Badge variant={typeBadgeVariant[championship.tipo] ?? 'default'}>
                {typeLabels[championship.tipo] ?? championship.tipo}
              </Badge>
              <StatusBadge status={championship.activo ? 'ACTIVO' : 'INACTIVO'} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {championship.categoria?.nombre ?? 'Sin categoría'} -{' '}
              {championship.temporada?.nombre ?? 'Sin temporada'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          leftIcon={<Edit className="h-4 w-4" />}
          onClick={() => router.push(`/championships/${id}/edit`)}
        >
          Editar
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
}
