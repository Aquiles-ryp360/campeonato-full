"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import type { AuthRole, AuthSession } from "@/lib/auth";
import { canAccess, clearStoredSession, getStoredSession } from "@/lib/auth";
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
    setSession(getStoredSession());
    setReady(true);
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
                ver este panel. Por ahora es un login demo guardado en este navegador.
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
    setSession(getStoredSession());
  }, []);

  if (!session) return null;

  return (
    <button
      type="button"
      onClick={() => {
        clearStoredSession();
        setSession(null);
        window.location.href = "/";
      }}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-mist px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white"
      title={`${session.displayName} (${session.role})`}
    >
      <LogOut className="h-4 w-4" />
      Salir
    </button>
  );
}
