import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: boolean;
}

export function Card({ className, children, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        padding && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-3 border-t border-gray-200 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
