'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChampionships } from '@/hooks/useChampionship';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { useMatches } from '@/hooks/useMatches';
import { Card, CardHeader } from '@/components/ui/card';
import { StatsCards, type StatsCardItem } from '@/components/charts/stats-cards';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select } from '@/components/ui/select';
import { StandingsChart } from '@/components/charts/standings-chart';
import { useChampionshipStandings } from '@/hooks/useChampionship';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Partido, StandingsEntry } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: championshipsData, isLoading: champsLoading } = useChampionships();
  const championships = championshipsData?.data?.data ?? [];
  const [selectedChampionshipId, setSelectedChampionshipId] = useState<string>('');

  const selectedChampId = selectedChampionshipId || championships[0]?.id || '';

  const { data: teamsData, isLoading: teamsLoading } = useTeams(selectedChampId || undefined);
  const { data: playersData, isLoading: playersLoading } = usePlayers();
  const { data: matchesData, isLoading: matchesLoading } = useMatches(
    selectedChampId ? { campeonatoId: selectedChampId, limit: 100 } : { limit: 100 },
  );
  const { data: standingsData, isLoading: standingsLoading } = useChampionshipStandings(selectedChampId);

  const teams = teamsData?.data ?? [];
  const players = playersData?.data ?? [];
  const matches = matchesData?.data?.data ?? [];
  const standings: StandingsEntry[] = standingsData?.data ?? [];

  const upcomingMatches = matches
    .filter((m) => m.estado === 'PROGRAMADO' || m.estado === 'PENDIENTE')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5);

  const recentResults = matches
    .filter((m) => m.estado === 'FINALIZADO')
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);

  const sanctionsCount = players.filter(
    (p) => p.estado === 'SUSPENDIDO',
  ).length;

  const statsItems: StatsCardItem[] = [
    {
      label: 'Equipos',
      value: teams.length,
      icon: Shield,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      label: 'Jugadores',
      value: players.length,
      icon: Users,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      label: 'Partidos',
      value: matches.length,
      icon: Calendar,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      label: 'Sanciones',
      value: sanctionsCount,
      icon: AlertTriangle,
      color: '#EF4444',
      bgColor: '#FEF2F2',
    },
    {
      label: 'Próximos',
      value: upcomingMatches.length,
      icon: Trophy,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
  ];

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const alerts: { type: 'warning' | 'info' | 'danger'; message: string }[] = [];
  if (upcomingMatches.length === 0 && matches.length > 0) {
    alerts.push({ type: 'info', message: 'No hay partidos programados próximamente' });
  }
  if (sanctionsCount > 0) {
    alerts.push({ type: 'danger', message: `${sanctionsCount} jugador(es) suspendido(s) activamente` });
  }
  const teamsWithoutPlayers = teams.filter(
    (t) => !players.some((p) => p.equipoId === t.id),
  );
  if (teamsWithoutPlayers.length > 0) {
    alerts.push({ type: 'warning', message: `${teamsWithoutPlayers.length} equipo(s) sin jugadores registrados` });
  }

  const isLoading = champsLoading || teamsLoading || playersLoading || matchesLoading || standingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.nombre ?? 'Usuario'}
          </h1>
          <p className="text-sm text-gray-500">
            Panel de control del campeonato
          </p>
        </div>
        {championshipOptions.length > 0 && (
          <Select
            options={championshipOptions}
            value={selectedChampionshipId}
            onChange={(e) => setSelectedChampionshipId(e.target.value)}
            placeholder="Seleccionar campeonato"
            className="w-full sm:w-64"
          />
        )}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                alert.type === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : alert.type === 'warning'
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {alert.type === 'danger' ? (
                <XCircle className="h-4 w-4 shrink-0" />
              ) : alert.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando datos..." />
      ) : (
        <>
          <StatsCards items={statsItems} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Próximos Partidos
                </h3>
              </CardHeader>
              {upcomingMatches.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Sin partidos programados"
                  description="No hay partidos próximos para este campeonato"
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between px-6 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {match.equipoLocal?.nombre ?? 'Local'} vs{' '}
                            {match.equipoVisitante?.nombre ?? 'Visitante'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(match.fecha)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={match.estado} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Últimos Resultados
                </h3>
              </CardHeader>
              {recentResults.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin resultados"
                  description="No hay partidos finalizados aún"
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentResults.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between px-6 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {match.equipoLocal?.nombre ?? 'Local'}{' '}
                            <span className="font-bold">
                              {match.golesLocal ?? '-'}
                            </span>{' '}
                            vs{' '}
                            <span className="font-bold">
                              {match.golesVisitante ?? '-'}
                            </span>{' '}
                            {match.equipoVisitante?.nombre ?? 'Visitante'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(match.fecha)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={match.estado} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Tabla de Posiciones
              </h3>
            </CardHeader>
            {standings.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="Sin datos de posiciones"
                description="No hay suficientes datos para mostrar la tabla"
              />
            ) : (
              <StandingsChart data={standings} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
