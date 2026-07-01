import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Settings2,
  Trophy,
  UserPlus,
  UsersRound,
  BookOpen,
  Calendar,
  ClipboardCheck
} from "lucide-react";
import { AuthGate, MobileLogoutAction, MobileSessionAction, SessionActions } from "./auth-gate";

type ShellNavLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ShellNavItem = ShellNavLink;

const publicNav: ShellNavItem[] = [
  { href: "/", label: "Inicio", icon: Trophy },
  { href: "/c/default/fixture", label: "Fixture del dia", icon: Calendar },
  { href: "/c/default/bases", label: "Bases", icon: BookOpen },
  { href: "/c/default/registro", label: "Inscribir equipo", icon: UserPlus }
];

const adminNav: ShellNavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/campeonatos", label: "Campeonatos", icon: Trophy },
  { href: "/admin/equipos", label: "Inscripciones", icon: UsersRound },
  { href: "/admin/fixture", label: "Fixture", icon: Calendar },
  { href: "/admin/resultados", label: "Resultados", icon: BarChart3 },
  { href: "/admin/configuracion", label: "Configuracion", icon: Settings2 }
];

const delegateNav: ShellNavItem[] = [
  { href: "/delegado", label: "Resumen", icon: LayoutDashboard },
  { href: "/delegado/inscripcion", label: "Mi inscripcion", icon: ShieldCheck },
  { href: "/delegado/plantel", label: "Plantel", icon: UsersRound },
  { href: "/delegado/partidos", label: "Mis partidos", icon: Calendar },
  { href: "/delegado/avisos", label: "Avisos y bases", icon: FileText }
];

const refereeNav: ShellNavItem[] = [
  { href: "/arbitro", label: "Mis partidos", icon: ClipboardCheck },
  { href: "/c/default/fixture", label: "Fixture del dia", icon: Calendar },
  { href: "/c/default/bases", label: "Bases", icon: BookOpen }
];

function Header({
  nav,
  eyebrow,
  showPanelLink
}: {
  nav: ShellNavItem[];
  eyebrow: string;
  showPanelLink: boolean;
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
        <nav className="hidden items-center justify-end gap-1 md:flex md:flex-wrap">
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
          <SessionActions showPanelLink={showPanelLink} />
        </nav>
      </div>
    </header>
  );
}

function MobileNav({
  nav,
  showSessionAction,
  showLogoutAction
}: {
  nav: ShellNavItem[];
  showSessionAction: boolean;
  showLogoutAction: boolean;
}) {
  const actionCount = (showSessionAction ? 1 : 0) + (showLogoutAction ? 1 : 0);
  const visibleNav = nav.slice(0, Math.max(1, 5 - actionCount));
  const columnCount = Math.min(5, visibleNav.length + actionCount);

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
        {showLogoutAction ? <MobileLogoutAction /> : null}
      </div>
    </nav>
  );
}

function ShellFrame({
  children,
  nav,
  eyebrow,
  showMobileSessionAction = false,
  showMobileLogoutAction = false,
  showPanelLink = true
}: {
  children: ReactNode;
  nav: ShellNavItem[];
  eyebrow: string;
  showMobileSessionAction?: boolean;
  showMobileLogoutAction?: boolean;
  showPanelLink?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <Header nav={nav} eyebrow={eyebrow} showPanelLink={showPanelLink} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      <MobileNav
        nav={nav}
        showSessionAction={showMobileSessionAction}
        showLogoutAction={showMobileLogoutAction}
      />
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={publicNav}
      eyebrow="Fixture, bases e inscripciones"
      showMobileSessionAction
    >
      {children}
    </ShellFrame>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={adminNav}
      eyebrow="Panel administrador"
      showMobileSessionAction
      showPanelLink={false}
    >
      <AuthGate role="admin">{children}</AuthGate>
    </ShellFrame>
  );
}

export function DelegateShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={delegateNav}
      eyebrow="Panel delegado"
      showMobileSessionAction
      showPanelLink={false}
    >
      <AuthGate role="delegate">{children}</AuthGate>
    </ShellFrame>
  );
}

export function RefereeShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={refereeNav}
      eyebrow="Panel arbitro"
      showMobileSessionAction
      showMobileLogoutAction
      showPanelLink={false}
    >
      <AuthGate role="referee">{children}</AuthGate>
    </ShellFrame>
  );
}

export const AppShell = PublicShell;
