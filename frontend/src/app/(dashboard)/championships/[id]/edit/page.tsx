'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useChampionship,
  useUpdateChampionship,
} from '@/hooks/useChampionship';
import { CampeonatoForm } from '@/components/forms/campeonato-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditChampionshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useChampionship(id);
  const updateMutation = useUpdateChampionship();
  const [saving, setSaving] = useState(false);

  const championship = data?.data;

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id,
        data: formData,
      });
      toast.success('Campeonato actualizado exitosamente');
      router.push(`/championships/${id}`);
    } catch {
      toast.error('Error al actualizar el campeonato');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner className="py-20" size="lg" label="Cargando campeonato..." />
    );
  }

  if (error || !championship) {
    return (
      <EmptyState
        icon={Trophy}
        title="Campeonato no encontrado"
        description="El campeonato que deseas editar no existe."
        action={{ label: 'Volver', onClick: () => router.push('/championships') }}
      />
    );
  }

  const initialData = {
    nombre: championship.nombre,
    tipo: championship.tipo,
    descripcion: championship.descripcion ?? '',
    deporte: '',
    fechaInicio: championship.fechaInicio.split('T')[0],
    fechaFin: championship.fechaFin ? championship.fechaFin.split('T')[0] : '',
    minEquipos: 2,
    maxEquipos: undefined,
    puntosPorVictoria: 3,
    puntosPorEmpate: 1,
    puntosPorDerrota: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/championships/${id}`)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Editar Campeonato
          </h1>
          <p className="text-sm text-gray-500">{championship.nombre}</p>
        </div>
      </div>

      <CampeonatoForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={saving}
      />
    </div>
  );
}
