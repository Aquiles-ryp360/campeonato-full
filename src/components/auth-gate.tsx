"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  ShieldCheck,
  UserRound
} from "lucide-react";
import type { AuthRole, AuthSession, ProtectedAuthRole } from "@/lib/auth";
import {
  canAccess,
  clearStoredSession,
  createSession,
  getStoredSession,
  sessionChangeEvent,
  storeSession
} from "@/lib/auth";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { Button, Card } from "./ui";

export function AuthGate({
  role,
  children
}: {
  role: ProtectedAuthRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const storedSession = getStoredSession();

      try {
        setSession(await loadBrowserSession(storedSession));
      } catch {
        clearStoredSession();
        setSession(null);
      } finally {
        setReady(true);
      }
    }

    void loadSession();
  }, []);

  if (!ready) {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-brand-muted">Validando acceso...</p>
      </Card>
    );
  }

  if (!canAccess(session, role)) {
    return (
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-yellow/25 text-brand-navy">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-ink">Acceso restringido</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-muted">
                Inicia sesion como {roleLabel(role)} para
                ver este panel.
              </p>
            </div>
          </div>
          <Button href={session ? "/" : `/login?next=${encodeURIComponent(pathname)}`}>
            <ShieldCheck className="h-4 w-4" />
            {session ? "Ir a vista publica" : "Ir a login"}
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}

export function SessionActions({ showPanelLink = true }: { showPanelLink?: boolean }) {
  const session = useSyncedSession();

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-yellowHover"
      >
        <LogIn className="h-4 w-4" />
        Ingresar
      </Link>
    );
  }

  const panelHref =
    session.role === "admin"
      ? "/admin"
      : session.role === "delegate"
        ? "/delegado"
        : session.role === "referee"
          ? "/arbitro"
          : "/";
  const panelLabel =
    session.role === "admin"
      ? "Admin"
      : session.role === "delegate"
        ? "Mi equipo"
        : session.role === "referee"
          ? "Arbitro"
          : "Vista publica";
  const PanelIcon =
    session.role === "admin"
      ? LayoutDashboard
      : session.role === "delegate"
        ? ShieldCheck
        : session.role === "referee"
          ? ClipboardCheck
          : UserRound;

  return (
    <>
      {showPanelLink ? (
        <Link
          href={panelHref}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-electric px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-institutional"
          title={`${session.displayName} (${session.role})`}
        >
          <PanelIcon className="h-4 w-4" />
          {panelLabel}
        </Link>
      ) : (
        <span
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white"
          title={`${session.displayName} (${session.role})`}
        >
          <UserRound className="h-4 w-4" />
          Cuenta
        </span>
      )}
      <button
        type="button"
        onClick={async () => {
          if (hasSupabaseEnv()) {
            await createSupabaseBrowserClient().auth.signOut();
          }

          clearStoredSession();
          window.location.href = "/";
        }}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
      >
        <LogOut className="h-4 w-4" />
        Salir
      </button>
    </>
  );
}

export function MobileSessionAction() {
  const session = useSyncedSession();

  const href = session
    ? session.role === "admin"
      ? "/admin"
      : session.role === "delegate"
        ? "/delegado"
        : session.role === "referee"
          ? "/arbitro"
        : "/"
    : "/login";
  const label = session
    ? session.role === "admin"
      ? "Admin"
      : session.role === "delegate"
        ? "Equipo"
        : session.role === "referee"
          ? "Arbitro"
        : "Cuenta"
    : "Ingresar";
  const Icon = session
    ? session.role === "admin"
      ? LayoutDashboard
      : session.role === "delegate"
        ? ShieldCheck
        : session.role === "referee"
          ? ClipboardCheck
        : UserRound
    : LogIn;

  return (
    <Link
      href={href}
      className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-[10.5px] font-bold text-brand-muted"
    >
      <Icon className="h-4 w-4" />
      <span className="w-full truncate text-center leading-tight">{label}</span>
    </Link>
  );
}

export function MobileLogoutAction() {
  const session = useSyncedSession();

  if (!session) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        if (hasSupabaseEnv()) {
          await createSupabaseBrowserClient().auth.signOut();
        }

        clearStoredSession();
        window.location.href = "/";
      }}
      className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-[10.5px] font-bold text-red-800"
    >
      <LogOut className="h-4 w-4" />
      <span className="w-full truncate text-center leading-tight">Salir</span>
    </button>
  );
}

function useSyncedSession() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      const storedSession = getStoredSession();
      if (mounted) setSession(storedSession);

      try {
        const verifiedSession = await loadBrowserSession(storedSession);
        if (mounted) setSession(verifiedSession);
      } catch {
        if (mounted) setSession(null);
      }
    }

    void syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);
    window.addEventListener(sessionChangeEvent, syncSession);

    return () => {
      mounted = false;
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
      window.removeEventListener(sessionChangeEvent, syncSession);
    };
  }, []);

  return session;
}

async function loadBrowserSession(storedSession: AuthSession | null) {
  if (!hasSupabaseEnv()) return storedSession;

  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    clearStoredSession();
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userData.user.id)
    .maybeSingle<{ role: string; full_name: string | null }>();

  if (profileError || !profile || !isAuthRole(profile.role)) {
    await supabase.auth.signOut();
    clearStoredSession();
    return null;
  }

  const username = userData.user.email ?? storedSession?.username ?? "usuario";
  const displayName = profile.full_name ?? userData.user.email ?? "Usuario";
  const createdAt =
    storedSession?.role === profile.role &&
    storedSession.username === username &&
    storedSession.displayName === displayName
      ? storedSession.createdAt
      : undefined;
  const verifiedSession = createSession(profile.role, username, displayName, createdAt);

  storeSession(verifiedSession);
  return verifiedSession;
}

function isAuthRole(role: string): role is AuthRole {
  return role === "admin" || role === "delegate" || role === "referee" || role === "viewer";
}

function roleLabel(role: ProtectedAuthRole) {
  if (role === "admin") return "administrador";
  if (role === "delegate") return "delegado";
  return "arbitro";
}
