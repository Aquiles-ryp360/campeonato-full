'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ImagePlus } from 'lucide-react';

const teamSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  nombreCorto: z.string().max(10).optional(),
  escudo: z.string().optional(),
  colorPrincipal: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hexadecimal inválido').optional(),
  colorSecundario: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hexadecimal inválido').optional(),
  campeonatoId: z.string().min(1, 'El campeonato es requerido'),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
  temporadaId: z.string().min(1, 'La temporada es requerida'),
});

type TeamFormData = z.infer<typeof teamSchema>;

export interface TeamFormProps {
  initialData?: Partial<TeamFormData>;
  onSubmit: (data: TeamFormData) => Promise<void>;
  isLoading?: boolean;
  campeonatos?: { label: string; value: string }[];
  categorias?: { label: string; value: string }[];
  temporadas?: { label: string; value: string }[];
}

export function TeamForm({
  initialData,
  onSubmit,
  isLoading,
  campeonatos = [],
  categorias = [],
  temporadas = [],
}: TeamFormProps) {
  const [shieldPreview, setShieldPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      colorPrincipal: '#3B82F6',
      colorSecundario: '#1D4ED8',
      ...initialData,
    },
  });

  const primaryColor = watch('colorPrincipal');

  const handleShieldUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setShieldPreview(result);
        setValue('escudo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardBody className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50"
                style={
                  shieldPreview
                    ? { backgroundImage: `url(${shieldPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}
                }
              >
                {!shieldPreview && <ImagePlus className="h-8 w-8 text-gray-400" />}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleShieldUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Escudo del Equipo</p>
              <p className="text-xs text-gray-500">PNG, JPG. Max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre del Equipo"
              error={errors.nombre?.message}
              {...register('nombre')}
            />
            <Input
              label="Nombre Corto"
              placeholder="Ej: BOC, RIV, CAR"
              maxLength={10}
              error={errors.nombreCorto?.message}
              {...register('nombreCorto')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Campeonato"
              options={campeonatos}
              placeholder="Seleccionar campeonato"
              error={errors.campeonatoId?.message}
              {...register('campeonatoId')}
            />
            <Select
              label="Categoría"
              options={categorias}
              placeholder="Seleccionar categoría"
              error={errors.categoriaId?.message}
              {...register('categoriaId')}
            />
            <Select
              label="Temporada"
              options={temporadas}
              placeholder="Seleccionar temporada"
              error={errors.temporadaId?.message}
              {...register('temporadaId')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Color Principal</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  defaultValue={primaryColor || '#3B82F6'}
                  onChange={(e) => setValue('colorPrincipal', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-gray-300"
                />
                <Input
                  {...register('colorPrincipal')}
                  placeholder="#3B82F6"
                  error={errors.colorPrincipal?.message}
                />
              </div>
            </div>
            <div>
              <label className="label">Color Secundario</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  defaultValue={initialData?.colorSecundario || '#1D4ED8'}
                  onChange={(e) => setValue('colorSecundario', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-gray-300"
                />
                <Input
                  {...register('colorSecundario')}
                  placeholder="#1D4ED8"
                  error={errors.colorSecundario?.message}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" isLoading={isLoading}>
              {initialData ? 'Actualizar' : 'Crear'} Equipo
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
