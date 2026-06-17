'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';

const matchSchema = z
  .object({
    fixtureId: z.string().min(1, 'La fecha es requerida'),
    ronda: z.coerce.number().int().min(1, 'La ronda es requerida'),
    equipoLocalId: z.string().min(1, 'El equipo local es requerido'),
    equipoVisitanteId: z.string().min(1, 'El equipo visitante es requerido'),
    canchaId: z.string().min(1, 'La cancha es requerida'),
    arbitroId: z.string().optional(),
    fechaProgramada: z.string().min(1, 'La fecha es requerida'),
    horaProgramada: z.string().min(1, 'La hora es requerida'),
  })
  .refine(
    (data) => data.equipoLocalId !== data.equipoVisitanteId,
    { message: 'El equipo local y visitante deben ser distintos', path: ['equipoVisitanteId'] },
  );

type MatchFormData = z.infer<typeof matchSchema>;

export interface MatchFormProps {
  initialData?: Partial<MatchFormData>;
  onSubmit: (data: MatchFormData) => Promise<void>;
  isLoading?: boolean;
  equipos?: { label: string; value: string }[];
  canchas?: { label: string; value: string }[];
  arbitros?: { label: string; value: string }[];
  fixtures?: { label: string; value: string }[];
}

export function MatchForm({
  initialData,
  onSubmit,
  isLoading,
  equipos = [],
  canchas = [],
  arbitros = [],
  fixtures = [],
}: MatchFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: initialData,
  });

  const localTeamId = watch('equipoLocalId');
  const availableAwayTeams = equipos.filter((t) => t.value !== localTeamId);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Fecha / Fixture"
              options={fixtures}
              placeholder="Seleccionar fecha"
              error={errors.fixtureId?.message}
              {...register('fixtureId')}
            />
            <Input
              label="Ronda / Jornada"
              type="number"
              min={1}
              error={errors.ronda?.message}
              {...register('ronda')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Equipo Local"
              options={equipos}
              placeholder="Seleccionar equipo local"
              error={errors.equipoLocalId?.message}
              {...register('equipoLocalId')}
            />
            <Select
              label="Equipo Visitante"
              options={availableAwayTeams}
              placeholder="Seleccionar equipo visitante"
              error={errors.equipoVisitanteId?.message}
              {...register('equipoVisitanteId')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Cancha"
              options={canchas}
              placeholder="Seleccionar cancha"
              error={errors.canchaId?.message}
              {...register('canchaId')}
            />
            <Select
              label="Árbitro"
              options={arbitros}
              placeholder="Seleccionar árbitro"
              error={errors.arbitroId?.message}
              {...register('arbitroId')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Fecha Programada"
              type="date"
              error={errors.fechaProgramada?.message}
              {...register('fechaProgramada')}
            />
            <Input
              label="Hora Programada"
              type="time"
              error={errors.horaProgramada?.message}
              {...register('horaProgramada')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" isLoading={isLoading}>
              {initialData ? 'Actualizar' : 'Crear'} Partido
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
