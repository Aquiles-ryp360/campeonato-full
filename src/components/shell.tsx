import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  AudioLines,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  FileText,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Settings2,
  Trophy,
  UserPlus,
  UserRound,
  UserCog,
  UsersRound,
  BookOpen,
  LayoutGrid,
  Calendar,
  Network,
  ListOrdered,
  MapPin
} from "lucide-react";
import { AuthGate, MobileSessionAction, SessionActions } from "./auth-gate";

type ShellNavLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ShellNavGroup = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  items: ShellNavLink[];
};

type ShellNavItem = ShellNavLink | ShellNavGroup;

const publicNav: ShellNavItem[] = [
  { href: "/", label: "Inicio", icon: Trophy },
  {
    label: "Campeonato",
    icon: Trophy,
    href: "/campeonato/futbol",
    items: [
      { href: "/campeonato/futbol", label: "Futbol", icon: Trophy },
      { href: "/campeonato/bases", label: "Bases", icon: BookOpen },
      { href: "/campeonato/grupos", label: "Grupos", icon: LayoutGrid },
      { href: "/campeonato/bracket", label: "Playoffs", icon: Network }
    ]
  },
  { href: "/campeonato/fixture", label: "Fixture", icon: Calendar },
  { href: "/campeonato/posiciones", label: "Posiciones", icon: ListOrdered },
  { href: "/equipos", label: "Equipos", icon: UsersRound },
  { href: "/registro", label: "Inscribir equipo", icon: UserPlus }
];

const adminNav: ShellNavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  {
    label: "Gestion",
    icon: ClipboardList,
    href: "/admin#campeonatos",
    items: [
      { href: "/admin#campeonatos", label: "Campeonatos", icon: Trophy },
      { href: "/admin#inscripciones", label: "Inscripciones", icon: UserPlus },
      { href: "/admin#equipos", label: "Equipos", icon: UsersRound },
      { href: "/admin#jugadores", label: "Jugadores", icon: UserRound }
    ]
  },
  {
    label: "Competencia",
    icon: Trophy,
    href: "/admin#fixture",
    items: [
      { href: "/admin#fixture", label: "Fixture", icon: Calendar },
      { href: "/admin#resultados", label: "Resultados", icon: BarChart3 },
      { href: "/campeonato/posiciones", label: "Tabla / grupos", icon: ListOrdered },
      { href: "/campeonato/bracket", label: "Playoffs", icon: Network }
    ]
  },
  {
    label: "Operacion",
    icon: MapPin,
    href: "/admin#operacion",
    items: [
      { href: "/admin/eventos", label: "Canchas y horarios", icon: Calendar },
      { href: "/admin#sanciones", label: "Sanciones", icon: Gavel },
      { href: "/admin#comunicados", label: "Comunicados", icon: Bell }
    ]
  },
  {
    label: "Sistema",
    icon: Settings2,
    href: "/admin#usuarios",
    items: [
      { href: "/admin#usuarios", label: "Usuarios y roles", icon: UserCog },
      { href: "/campeonato/bases", label: "Bases y reglas", icon: BookOpen },
      { href: "/admin#reportes", label: "Reportes", icon: FileText },
      { href: "/admin/eventos", label: "Configuracion", icon: Settings2 }
    ]
  },
  { href: "/admin/ia", label: "Audio IA", icon: AudioLines },
  { href: "/", label: "Vista publica", icon: Trophy }
];

const delegateNav: ShellNavItem[] = [
  { href: "/delegado#resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/delegado#mi-equipo", label: "Mi equipo", icon: ShieldCheck },
  { href: "/delegado#jugadores", label: "Jugadores", icon: UsersRound },
  { href: "/delegado#mis-partidos", label: "Mis partidos", icon: Calendar },
  {
    label: "Mas",
    icon: ListOrdered,
    href: "/delegado#resultados",
    items: [
      { href: "/delegado#resultados", label: "Resultados", icon: BarChart3 },
      { href: "/delegado#inscripcion", label: "Inscripcion", icon: UserPlus },
      { href: "/delegado#comunicados", label: "Comunicados", icon: Bell },
      { href: "/campeonato/bases", label: "Bases", icon: BookOpen },
      { href: "/", label: "Vista publica", icon: Trophy }
    ]
  }
];

function isNavGroup(item: ShellNavItem): item is ShellNavGroup {
  return "items" in item;
}

function getMobileNavLink(item: ShellNavItem): ShellNavLink {
  if (!isNavGroup(item)) return item;

  return {
    href: item.href ?? item.items[0]?.href ?? "/",
    label: item.label,
    icon: item.icon
  };
}

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

            if (isNavGroup(item)) {
              return (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href ?? item.items[0]?.href ?? "/"}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-mist hover:text-ink focus:bg-mist focus:text-ink"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Link>
                  <div className="invisible absolute right-0 top-full z-50 min-w-56 translate-y-2 rounded-md border border-ink/10 bg-white p-1 opacity-0 shadow-panel transition group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100">
                    {item.items.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-mist hover:text-ink focus:bg-mist focus:text-ink"
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

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
  showSessionAction
}: {
  nav: ShellNavItem[];
  showSessionAction: boolean;
}) {
  const visibleNav = (showSessionAction ? nav.slice(0, 4) : nav.slice(0, 5)).map(
    getMobileNavLink
  );
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
  showMobileSessionAction = false,
  showPanelLink = true
}: {
  children: ReactNode;
  nav: ShellNavItem[];
  eyebrow: string;
  showMobileSessionAction?: boolean;
  showPanelLink?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <Header nav={nav} eyebrow={eyebrow} showPanelLink={showPanelLink} />
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

export const AppShell = PublicShell;
