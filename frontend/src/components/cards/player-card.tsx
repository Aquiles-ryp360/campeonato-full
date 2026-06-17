'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { type Jugador } from '@/types';
import { Shield, User } from 'lucide-react';

export interface PlayerCardProps {
  player: Jugador;
  teamName?: string;
  teamShield?: string | null;
  cardCode?: string;
  issueDate?: string;
  expiryDate?: string;
  className?: string;
}

export function PlayerCard({
  player,
  teamName,
  teamShield,
  cardCode,
  issueDate,
  expiryDate,
  className,
}: PlayerCardProps) {
  return (
    <div
      id={`player-card-${player.id}`}
      className={cn(
        'relative w-[340px] overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-lg',
        className,
      )}
    >
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary-100 opacity-50" />
      <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-6 translate-y-6 rounded-full bg-primary-100 opacity-30" />

      <div className="relative p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary-600">
              Carnet de Jugador
            </p>
            <h3 className="text-sm font-bold text-gray-900">
              {player.nombre} {player.apellido}
            </h3>
          </div>
          <StatusBadge status={player.estado} />
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100">
            {player.foto ? (
              <img
                src={player.foto}
                alt={`${player.nombre} ${player.apellido}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {teamShield ? (
                <img src={teamShield} alt={teamName} className="h-6 w-6 object-contain" />
              ) : (
                <Shield className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">{teamName || 'Sin equipo'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
                {player.numeroCamiseta || '--'}
              </div>
              <span className="text-xs text-gray-500">
                {player.posicion || 'Sin posición'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-1.5 rounded-lg bg-gray-50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Documento</span>
            <span className="font-medium text-gray-900">
              {player.dni || '---'}
            </span>
          </div>
          {cardCode && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Código</span>
              <span className="font-mono font-medium text-gray-900">{cardCode}</span>
            </div>
          )}
          {issueDate && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Emisión</span>
              <span className="font-medium text-gray-900">{formatDate(issueDate)}</span>
            </div>
          )}
          {expiryDate && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Vencimiento</span>
              <span className="font-medium text-gray-900">{formatDate(expiryDate)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
            <span className="text-[8px] text-gray-400">QR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
