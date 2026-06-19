import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export interface LoadingSpinnerProps {
  size?: keyof typeof sizeStyles;
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  label,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
    >
      <Loader2
        className={cn('animate-spin text-primary-600', sizeStyles[size])}
      />
      {label && (
        <p className="text-sm text-gray-500">{label}</p>
      )}
    </div>
  );
}
