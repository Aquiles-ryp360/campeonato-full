'use client';

import { useState } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { useChampionships } from '@/hooks/useChampionship';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  IdCard,
  Search,
  Download,
  Printer,
  XCircle,
  Plus,
  Shield,
  CheckCircle2,
  User,
  UserCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Jugador } from '@/types';
import toast from 'react-hot-toast';

type TabId = 'jugadores' | 'delegados';

export default function CardsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('jugadores');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Jugador | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const { data: playersData, isLoading } = usePlayers();
  const players: Jugador[] = playersData?.data ?? [];
  const { data: champsData } = useChampionships();
  const championships = champsData?.data?.data ?? [];

  const filteredPlayers = players.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.dni ?? '').toLowerCase().includes(q)
    );
  });

  const handleValidate = () => {
    if (!validationCode.trim()) {
      setValidationResult({
        valid: false,
        message: 'Ingrese un código de carnet para validar',
      });
      return;
    }
    const found = players.find(
      (p) =>
        p.dni === validationCode.trim() ||
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(
          validationCode.toLowerCase(),
        ),
    );
    if (found) {
      setValidationResult({
        valid: true,
        message: `Carnet válido - ${found.nombre} ${found.apellido}`,
      });
    } else {
      setValidationResult({
        valid: false,
        message: 'Carnet no encontrado o inválido',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Carnets Digitales
          </h1>
          <p className="text-sm text-gray-500">
            Gestión de carnets de jugadores y delegados
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0">
          <button
            onClick={() => setActiveTab('jugadores')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'jugadores'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <User className="h-4 w-4" />
            Carnets de Jugadores
          </button>
          <button
            onClick={() => setActiveTab('delegados')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'delegados'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Carnets de Delegados
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nombre, documento o código..."
          className="w-full sm:w-80"
        />
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Generar Carnet
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="Cargando jugadores..." />
      ) : filteredPlayers.length === 0 ? (
        <EmptyState
          icon={IdCard}
          title="Sin resultados"
          description="No se encontraron jugadores que coincidan con la búsqueda"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Card key={player.id} className="flex flex-col">
              <CardBody>
                <div className="flex items-center gap-4">
                  {player.foto ? (
                    <img
                      src={player.foto}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                      <IdCard className="h-6 w-6 text-primary-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {player.nombre} {player.apellido}
                    </p>
                    <p className="text-sm text-gray-500">
                      {player.equipo?.nombre ?? 'Sin equipo'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {player.posicion ?? 'Sin posición'}
                    </p>
                  </div>
                </div>
              </CardBody>
              <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-6 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IdCard className="h-3 w-3" />}
                  onClick={() => {
                    setSelectedPlayer(player);
                    setPreviewOpen(true);
                  }}
                >
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Download className="h-3 w-3" />}
                >
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Printer className="h-3 w-3" />}
                >
                  Imprimir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Validar Carnet
          </h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SearchInput
                value={validationCode}
                onChange={setValidationCode}
                placeholder="Ingrese código del carnet o DNI..."
              />
            </div>
            <Button
              leftIcon={<Search className="h-4 w-4" />}
              onClick={handleValidate}
            >
              Validar
            </Button>
          </div>
          {validationResult && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                validationResult.valid
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {validationResult.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {validationResult.message}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Vista Previa del Carnet"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPreviewOpen(false)}
            >
              Cerrar
            </Button>
            <Button leftIcon={<Download className="h-4 w-4" />}>
              Descargar PDF
            </Button>
          </div>
        }
      >
        {selectedPlayer && (
          <div className="rounded-xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
                {selectedPlayer.foto ? (
                  <img
                    src={selectedPlayer.foto}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <IdCard className="h-10 w-10 text-primary-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedPlayer.nombre} {selectedPlayer.apellido}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedPlayer.posicion ?? 'Jugador'}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Documento</span>
                <span className="font-medium">
                  {selectedPlayer.dni ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Equipo</span>
                <span className="font-medium">
                  {selectedPlayer.equipo?.nombre ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Número</span>
                <span className="font-medium">
                  {selectedPlayer.numeroCamiseta ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <Badge
                  variant={
                    selectedPlayer.estado === 'ACTIVO'
                      ? 'success'
                      : 'default'
                  }
                >
                  {selectedPlayer.estado}
                </Badge>
              </div>
            </div>
            <div className="mt-4 border-t border-primary-100 pt-3 text-center text-xs text-gray-400">
              <p>Campeonato - Gestión de Torneos</p>
              <p>Válido hasta: {formatDate(new Date().getFullYear() + 1, 0, 1)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
