"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LockKeyhole, LogIn, LogOut, ShieldCheck } from "lucide-react";
import type { AuthRole, AuthSession } from "@/lib/auth";
import {
  canAccess,
  clearStoredSession,
  createSession,
  getStoredSession,
  storeSession
} from "@/lib/auth";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { Button, Card } from "./ui";

export function AuthGate({
  role,
  children
}: {
  role: AuthRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const storedSession = getStoredSession();

      if (!hasSupabaseEnv()) {
        setSession(storedSession);
        setReady(true);
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          clearStoredSession();
          setSession(null);
          setReady(true);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (
          profileError ||
          !profile ||
          (profile.role !== "admin" && profile.role !== "delegate")
        ) {
          await supabase.auth.signOut();
          clearStoredSession();
          setSession(null);
          setReady(true);
          return;
        }

        const verifiedSession = createSession(
          profile.role,
          userData.user.email ?? storedSession?.username ?? "usuario",
          profile.full_name ?? userData.user.email ?? "Usuario"
        );

        storeSession(verifiedSession);
        setSession(verifiedSession);
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
        <p className="text-sm font-semibold text-ink/60">Validando acceso...</p>
      </Card>
    );
  }

  if (!canAccess(session, role)) {
    return (
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-900">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-ink">Acceso restringido</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">
                Inicia sesion como {role === "admin" ? "administrador" : "delegado"} para
                ver este panel.
              </p>
            </div>
          </div>
          <Button href={`/login?next=${encodeURIComponent(pathname)}`}>
            <ShieldCheck className="h-4 w-4" />
            Ir a login
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}

export function SessionActions() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredSession());
    }

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
      >
        <LogIn className="h-4 w-4" />
        Login
      </Link>
    );
  }

  const panelHref = session.role === "admin" ? "/admin" : "/delegado";
  const panelLabel = session.role === "admin" ? "Admin" : "Mi equipo";
  const PanelIcon = session.role === "admin" ? LayoutDashboard : ShieldCheck;

  return (
    <>
      <Link
        href={panelHref}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-field px-4 py-2 text-sm font-semibold text-white transition hover:bg-field/90"
        title={`${session.displayName} (${session.role})`}
      >
        <PanelIcon className="h-4 w-4" />
        {panelLabel}
      </Link>
      <button
        type="button"
        onClick={async () => {
          if (hasSupabaseEnv()) {
            await createSupabaseBrowserClient().auth.signOut();
          }

          clearStoredSession();
          setSession(null);
          window.location.href = "/";
        }}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-mist px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white"
      >
        <LogOut className="h-4 w-4" />
        Salir
      </button>
    </>
  );
}

export function MobileSessionAction() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredSession());
    }

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  const href = session ? (session.role === "admin" ? "/admin" : "/delegado") : "/login";
  const label = session ? (session.role === "admin" ? "Admin" : "Equipo") : "Login";
  const Icon = session ? (session.role === "admin" ? LayoutDashboard : ShieldCheck) : LogIn;

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold text-ink/70"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
