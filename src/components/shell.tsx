import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  AudioLines,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
  UserPlus,
  UsersRound
} from "lucide-react";
import { AuthGate, MobileSessionAction, SessionActions } from "./auth-gate";

type ShellNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const publicNav: ShellNavItem[] = [
  { href: "/", label: "Fixture", icon: Trophy },
  { href: "/registro", label: "Inscripciones", icon: UserPlus },
  { href: "/equipos", label: "Equipos", icon: UsersRound }
];

const adminNav: ShellNavItem[] = [
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
  { href: "/admin/eventos", label: "Eventos", icon: ClipboardList },
  { href: "/admin/ia", label: "Audio IA", icon: AudioLines },
  { href: "/", label: "Vista publica", icon: Trophy },
  { href: "/delegado", label: "Panel delegado", icon: ShieldCheck }
];

const delegateNav: ShellNavItem[] = [
  { href: "/delegado", label: "Mi equipo", icon: ShieldCheck },
  { href: "/", label: "Fixture", icon: Trophy },
  { href: "/equipos", label: "Equipos", icon: UsersRound }
];

function Header({
  nav,
  eyebrow
}: {
  nav: ShellNavItem[];
  eyebrow: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-ink">Campeonato Carreras</p>
            <p className="text-xs text-ink/55">{eyebrow}</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-mist hover:text-ink"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <SessionActions />
        </nav>
      </div>
    </header>
  );
}

function MobileNav({
  nav,
  showSessionAction
}: {
  nav: ShellNavItem[];
  showSessionAction: boolean;
}) {
  const visibleNav = showSessionAction ? nav.slice(0, 4) : nav.slice(0, 5);
  const columnCount = Math.min(5, visibleNav.length + (showSessionAction ? 1 : 0));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white md:hidden">
      <div
        className={`grid ${
          columnCount >= 5 ? "grid-cols-5" : columnCount === 4 ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold text-ink/70"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {showSessionAction ? <MobileSessionAction /> : null}
      </div>
    </nav>
  );
}

function ShellFrame({
  children,
  nav,
  eyebrow,
  showMobileSessionAction = false
}: {
  children: ReactNode;
  nav: ShellNavItem[];
  eyebrow: string;
  showMobileSessionAction?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <Header nav={nav} eyebrow={eyebrow} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      <MobileNav nav={nav} showSessionAction={showMobileSessionAction} />
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={publicNav}
      eyebrow="Fixture, inscripciones y equipos"
      showMobileSessionAction
    >
      {children}
    </ShellFrame>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame nav={adminNav} eyebrow="Panel administrador">
      <AuthGate role="admin">{children}</AuthGate>
    </ShellFrame>
  );
}

export function DelegateShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame nav={delegateNav} eyebrow="Panel delegado">
      <AuthGate role="delegate">{children}</AuthGate>
    </ShellFrame>
  );
}

export const AppShell = PublicShell;
