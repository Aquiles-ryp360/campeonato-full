'use client';

import { useState } from 'react';
import { useChampionships } from '@/hooks/useChampionship';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  FileText,
  Calendar,
  BarChart3,
  Users,
  Gavel,
  Download,
  FileSpreadsheet,
  Trophy,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReportType {
  id: string;
  label: string;
  icon: typeof FileText;
  description: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'fixture',
    label: 'Fixture',
    icon: Calendar,
    description: 'Listado completo de partidos por jornada',
  },
  {
    id: 'cronograma',
    label: 'Cronograma',
    icon: Clock,
    description: 'Calendario de partidos con fechas y canchas',
  },
  {
    id: 'posiciones',
    label: 'Tabla de Posiciones',
    icon: BarChart3,
    description: 'Clasificación actualizada del campeonato',
  },
  {
    id: 'jugadores',
    label: 'Lista de Jugadores',
    icon: Users,
    description: 'Listado completo de jugadores habilitados',
  },
  {
    id: 'sancionados',
    label: 'Lista de Sancionados',
    icon: Gavel,
    description: 'Jugadores con sanciones activas',
  },
];

type FormatType = 'pdf' | 'excel';

export default function ReportsPage() {
  const { data: champsData, isLoading: champsLoading } = useChampionships();
  const championships = champsData?.data?.data ?? [];
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('pdf');
  const [generating, setGenerating] = useState<string | null>(null);

  const championshipOptions = championships.map((c) => ({
    label: c.nombre,
    value: c.id,
  }));

  const recentReports = [
    { id: '1', name: 'Fixture - Jornada 1', format: 'PDF', date: new Date(), championship: 'Liga Municipal 2024' },
    { id: '2', name: 'Tabla de Posiciones', format: 'Excel', date: new Date(Date.now() - 86400000), championship: 'Liga Municipal 2024' },
  ];

  const handleGenerate = async (reportId: string) => {
    if (!selectedChampionship) {
      toast.error('Seleccione un campeonato primero');
      return;
    }
    setGenerating(reportId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(
        `Reporte ${
          reportTypes.find((r) => r.id === reportId)?.label ?? reportId
        } generado en formato ${selectedFormat.toUpperCase()}`,
      );
    } catch {
      toast.error('Error al generar el reporte');
    } finally {
      setGenerating(null);
    }
  };

  if (champsLoading) {
    return <LoadingSpinner className="py-20" size="lg" label="Cargando..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">
            Genera reportes y exporta datos del campeonato
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select
          options={championshipOptions}
          value={selectedChampionship}
          onChange={(e) => setSelectedChampionship(e.target.value)}
          placeholder="Seleccionar campeonato"
          className="w-full sm:w-64"
        />
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setSelectedFormat('pdf')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              selectedFormat === 'pdf'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={() => setSelectedFormat('excel')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              selectedFormat === 'excel'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {!selectedChampionship ? (
        <EmptyState
          icon={FileText}
          title="Selecciona un campeonato"
          description="Elige un campeonato para generar reportes"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            return (
              <Card key={report.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="mb-1 font-semibold text-gray-900">
                    {report.label}
                  </h3>
                  <p className="mb-6 text-sm text-gray-500">
                    {report.description}
                  </p>
                  <div className="mt-auto">
                    <Button
                      className="w-full"
                      variant="outline"
                      leftIcon={
                        isGenerating ? undefined : (
                          <Download className="h-4 w-4" />
                        )
                      }
                      isLoading={isGenerating}
                      onClick={() => handleGenerate(report.id)}
                    >
                      {isGenerating ? 'Generando...' : `Descargar ${selectedFormat.toUpperCase()}`}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {recentReports.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Reportes Recientes
            </h3>
          </CardHeader>
          <CardBody>
            <div className="divide-y divide-gray-100">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {report.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {report.championship} - {formatDate(report.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {report.format}
                    </span>
                    <Button variant="ghost" size="sm" leftIcon={<Download className="h-3 w-3" />}>
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
