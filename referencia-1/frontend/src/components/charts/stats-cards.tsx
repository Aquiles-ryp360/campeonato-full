'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  Shield,
  Calendar,
  AlertTriangle,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export interface StatsCardItem {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  suffix?: string;
}

export interface StatsCardsProps {
  items: StatsCardItem[];
  className?: string;
}

function AnimatedCounter({
  target,
  suffix,
  duration = 1000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setCount(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          function animate(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(target);
            }
          }

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return (
    <span ref={ref} className="text-2xl font-bold">
      {count}
      {suffix}
    </span>
  );
}

export function StatsCards({ items, className }: StatsCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5', className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: item.bgColor }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: item.color }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <AnimatedCounter
                target={item.value}
                suffix={item.suffix}
              />
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const defaultStatsItems: StatsCardItem[] = [
  {
    label: 'Equipos',
    value: 0,
    icon: Shield,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    label: 'Jugadores',
    value: 0,
    icon: Users,
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  {
    label: 'Partidos Jugados',
    value: 0,
    icon: Calendar,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    suffix: '%',
  },
  {
    label: 'Sanciones Activas',
    value: 0,
    icon: AlertTriangle,
    color: '#EF4444',
    bgColor: '#FEF2F2',
  },
  {
    label: 'Próximos Partidos',
    value: 0,
    icon: Trophy,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
];
