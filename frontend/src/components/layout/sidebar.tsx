'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Users,
  Calendar,
  MapPin,
  BarChart3,
  AlertTriangle,
  CreditCard,
  FileText,
  ChevronLeft,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campeonatos', href: '/campeonatos', icon: Trophy },
  { name: 'Equipos', href: '/equipos', icon: Shield },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Partidos', href: '/partidos', icon: Calendar },
  { name: 'Canchas', href: '/canchas', icon: MapPin },
  { name: 'Tabla de Posiciones', href: '/posiciones', icon: BarChart3 },
  { name: 'Sanciones', href: '/sanciones', icon: AlertTriangle },
  { name: 'Carnets', href: '/carnets', icon: CreditCard },
  { name: 'Reportes', href: '/reportes', icon: FileText },
];

export interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
  isMobileOpen?: boolean;
}

export function Sidebar({
  collapsed = false,
  onToggle,
  onMobileClose,
  isMobileOpen = false,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-white shadow-lg transition-all duration-300 lg:static lg:z-0',
          collapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {collapsed ? (
            <span className="text-xl font-bold text-primary-600">C</span>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary-600" />
              <span className="text-lg font-bold text-gray-900">
                Campeonato
              </span>
            </Link>
          )}
          <button
            onClick={onToggle}
            className="hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
          >
            <ChevronLeft
              className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              AD
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  Admin User
                </p>
                <p className="truncate text-xs text-gray-500">admin@email.com</p>
              </div>
            )}
            <button
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
