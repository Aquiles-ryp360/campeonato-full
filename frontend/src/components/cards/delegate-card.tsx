'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { type Delegate } from '@/types';
import { Shield, User, Mail, Phone } from 'lucide-react';

export interface DelegateCardProps {
  delegate: Delegate;
  teamName?: string;
  teamShield?: string | null;
  cardCode?: string;
  issueDate?: string;
  expiryDate?: string;
  className?: string;
}

export function DelegateCard({
  delegate,
  teamName,
  teamShield,
  cardCode,
  issueDate,
  expiryDate,
  className,
}: DelegateCardProps) {
  return (
    <div
      id={`delegate-card-${delegate.id}`}
      className={cn(
        'relative w-[340px] overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-yellow-50 shadow-lg',
        className,
      )}
    >
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-yellow-100 opacity-50" />
      <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-6 translate-y-6 rounded-full bg-yellow-100 opacity-30" />

      <div className="relative p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
              Carnet de Delegado
            </p>
            <h3 className="text-sm font-bold text-gray-900">
              {delegate.nombre} {delegate.apellido}
            </h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {delegate.cargo}
          </span>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100">
            <User className="h-8 w-8 text-gray-400" />
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              {teamShield ? (
                <img src={teamShield} alt={teamName} className="h-6 w-6 object-contain" />
              ) : (
                <Shield className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {teamName || 'Sin equipo'}
              </span>
            </div>
            {delegate.email && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="h-3 w-3" />
                <span>{delegate.email}</span>
              </div>
            )}
            {delegate.telefono && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="h-3 w-3" />
                <span>{delegate.telefono}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-1.5 rounded-lg bg-amber-50/50 p-3">
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
