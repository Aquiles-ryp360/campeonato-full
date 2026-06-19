'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ChampionshipType } from '@/types';

const championshipTypeOptions = Object.values(ChampionshipType).map((t) => ({
  label:
    { LIGA: 'Liga', COPA: 'Copa', TORNEO: 'Torneo', AMISTOSO: 'Amistoso' }[
      t
    ] || t,
  value: t,
}));

const campeonatoSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido').max(100),
    descripcion: z.string().max(500).optional(),
    tipo: z.nativeEnum(ChampionshipType),
    deporte: z.string().min(1, 'El deporte es requerido'),
    fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
    fechaFin: z.string().optional(),
    fechaInscripcion: z.string().optional(),
    minEquipos: z.coerce.number().min(2, 'Mínimo 2 equipos').optional(),
    maxEquipos: z.coerce.number().min(2, 'Mínimo 2 equipos').optional(),
    puntosPorVictoria: z.coerce.number().min(0).default(3),
    puntosPorEmpate: z.coerce.number().min(0).default(1),
    puntosPorDerrota: z.coerce.number().min(0).default(0),
    reglasDesempate: z.string().optional(),
    reglamento: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.fechaFin || !data.fechaInicio) return true;
      return new Date(data.fechaFin) >= new Date(data.fechaInicio);
    },
    { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fechaFin'] },
  );

type CampeonatoFormData = z.infer<typeof campeonatoSchema>;

export interface CampeonatoFormProps {
  initialData?: Partial<CampeonatoFormData>;
  onSubmit: (data: CampeonatoFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CampeonatoForm({
  initialData,
  onSubmit,
  isLoading,
}: CampeonatoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampeonatoFormData>({
    resolver: zodResolver(campeonatoSchema),
    defaultValues: {
      tipo: ChampionshipType.LIGA,
      puntosPorVictoria: 3,
      puntosPorEmpate: 1,
      puntosPorDerrota: 0,
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre del Campeonato"
              error={errors.nombre?.message}
              {...register('nombre')}
            />
            <Select
              label="Tipo"
              options={championshipTypeOptions}
              error={errors.tipo?.message}
              {...register('tipo')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input-field min-h-[80px]"
                {...register('descripcion')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Deporte"
              placeholder="Fútbol, Futsal, etc."
              error={errors.deporte?.message}
              {...register('deporte')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Fecha de Inicio"
              type="date"
              error={errors.fechaInicio?.message}
              {...register('fechaInicio')}
            />
            <Input
              label="Fecha de Fin"
              type="date"
              error={errors.fechaFin?.message}
              {...register('fechaFin')}
            />
            <Input
              label="Cierre de Inscripción"
              type="date"
              error={errors.fechaInscripcion?.message}
              {...register('fechaInscripcion')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Mínimo de Equipos"
              type="number"
              error={errors.minEquipos?.message}
              {...register('minEquipos')}
            />
            <Input
              label="Máximo de Equipos"
              type="number"
              error={errors.maxEquipos?.message}
              {...register('maxEquipos')}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Sistema de Puntuación
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Puntos por Victoria"
                type="number"
                error={errors.puntosPorVictoria?.message}
                {...register('puntosPorVictoria')}
              />
              <Input
                label="Puntos por Empate"
                type="number"
                error={errors.puntosPorEmpate?.message}
                {...register('puntosPorEmpate')}
              />
              <Input
                label="Puntos por Derrota"
                type="number"
                error={errors.puntosPorDerrota?.message}
                {...register('puntosPorDerrota')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Reglas de Desempate</label>
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Diferencia de gol, enfrentamiento directo, etc."
                {...register('reglasDesempate')}
              />
            </div>
            <div>
              <label className="label">Reglamento</label>
              <textarea
                className="input-field min-h-[120px]"
                {...register('reglamento')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" isLoading={isLoading}>
              {initialData ? 'Actualizar' : 'Crear'} Campeonato
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
