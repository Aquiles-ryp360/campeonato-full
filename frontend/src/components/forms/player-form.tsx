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

const documentTypeOptions = [
  { label: 'DNI', value: 'DNI' },
  { label: 'Carné de Extranjería', value: 'CE' },
  { label: 'Pasaporte', value: 'PASAPORTE' },
];

const positionOptions = [
  { label: 'Arquero', value: 'ARQUERO' },
  { label: 'Defensa', value: 'DEFENSA' },
  { label: 'Mediocampista', value: 'MEDIOCAMPISTA' },
  { label: 'Delantero', value: 'DELANTERO' },
  { label: 'Libero', value: 'LIBERO' },
  { label: 'Lateral', value: 'LATERAL' },
  { label: 'Volante', value: 'VOLANTE' },
  { label: 'Extremo', value: 'EXTREMO' },
];

const playerSchema = z.object({
  nombres: z.string().min(1, 'El nombre es requerido').max(100),
  apellidos: z.string().min(1, 'El apellido es requerido').max(100),
  tipoDocumento: z.enum(['DNI', 'CE', 'PASAPORTE']),
  numeroDocumento: z.string().min(1, 'El número de documento es requerido'),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es requerida')
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        return date < now;
      },
      { message: 'La fecha de nacimiento debe ser válida' },
    ),
  foto: z.string().optional(),
  numeroCamiseta: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(99, 'Máximo 99'),
  posicion: z.string().min(1, 'La posición es requerida'),
  equipoId: z.string().min(1, 'El equipo es requerido'),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export interface PlayerFormProps {
  initialData?: Partial<PlayerFormData>;
  onSubmit: (data: PlayerFormData) => Promise<void>;
  isLoading?: boolean;
  equipos?: { label: string; value: string }[];
}

export function PlayerForm({
  initialData,
  onSubmit,
  isLoading,
  equipos = [],
}: PlayerFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      tipoDocumento: 'DNI',
      ...initialData,
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPhotoPreview(result);
        setValue('foto', result);
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
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50"
                style={
                  photoPreview
                    ? { backgroundImage: `url(${photoPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}
                }
              >
                {!photoPreview && <ImagePlus className="h-8 w-8 text-gray-400" />}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Foto del Jugador</p>
              <p className="text-xs text-gray-500">PNG, JPG. Max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombres"
              error={errors.nombres?.message}
              {...register('nombres')}
            />
            <Input
              label="Apellidos"
              error={errors.apellidos?.message}
              {...register('apellidos')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              label="Tipo de Documento"
              options={documentTypeOptions}
              error={errors.tipoDocumento?.message}
              {...register('tipoDocumento')}
            />
            <Input
              label="Número de Documento"
              error={errors.numeroDocumento?.message}
              {...register('numeroDocumento')}
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              error={errors.fechaNacimiento?.message}
              {...register('fechaNacimiento')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Número de Camiseta"
              type="number"
              min={1}
              max={99}
              error={errors.numeroCamiseta?.message}
              {...register('numeroCamiseta')}
            />
            <Select
              label="Posición"
              options={positionOptions}
              placeholder="Seleccionar posición"
              error={errors.posicion?.message}
              {...register('posicion')}
            />
            <Select
              label="Equipo"
              options={equipos}
              placeholder="Seleccionar equipo"
              error={errors.equipoId?.message}
              {...register('equipoId')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" isLoading={isLoading}>
              {initialData ? 'Actualizar' : 'Crear'} Jugador
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
