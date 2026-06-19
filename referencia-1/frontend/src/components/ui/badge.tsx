import React from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Badge({
  className,
  variant = 'default',
  size = 'sm',
  children,
  onClick,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        onClick && 'cursor-pointer transition-opacity hover:opacity-80',
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </span>
  );
}
