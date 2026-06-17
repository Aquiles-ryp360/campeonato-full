'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateChampionship } from '@/hooks/useChampionship';
import { CampeonatoForm } from '@/components/forms/campeonato-form';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewChampionshipPage() {
  const router = useRouter();
  const createMutation = useCreateChampionship();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      const result = await createMutation.mutateAsync(formData);
      toast.success('Campeonato creado exitosamente');
      router.push(`/championships/${result.data.id}`);
    } catch {
      toast.error('Error al crear el campeonato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/championships')}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nuevo Campeonato
          </h1>
          <p className="text-sm text-gray-500">
            Completa el formulario para crear un nuevo campeonato
          </p>
        </div>
      </div>

      <CampeonatoForm onSubmit={handleSubmit} isLoading={saving} />
    </div>
  );
}
