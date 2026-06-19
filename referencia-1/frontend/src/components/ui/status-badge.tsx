import React from 'react';
import { Badge } from './badge';
import { MatchStatus, PlayerStatus, CardType } from '@/types';

type StatusValue = MatchStatus | PlayerStatus | CardType | string;

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  // MatchStatus
  PENDIENTE: { label: 'Pendiente', variant: 'warning' },
  PROGRAMADO: { label: 'Programado', variant: 'info' },
  EN_CURSO: { label: 'En Curso', variant: 'info' },
  FINALIZADO: { label: 'Finalizado', variant: 'success' },
  SUSPENDIDO: { label: 'Suspendido', variant: 'danger' },
  APLAZADO: { label: 'Aplazado', variant: 'warning' },
  // PlayerStatus
  ACTIVO: { label: 'Activo', variant: 'success' },
  LESIONADO: { label: 'Lesionado', variant: 'warning' },
  SUSPENDIDO: { label: 'Suspendido', variant: 'danger' },
  INACTIVO: { label: 'Inactivo', variant: 'default' },
  // CardType
  AMARILLA: { label: 'Tarjeta Amarilla', variant: 'warning' },
  ROJA: { label: 'Tarjeta Roja', variant: 'danger' },
  DOBLE_AMARILLA: { label: 'Doble Amarilla', variant: 'danger' },
  // Generic booleans
  true: { label: 'Activo', variant: 'success' },
  false: { label: 'Inactivo', variant: 'default' },
};

export interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: 'default' as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
