"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  demoAdminCredentials,
  demoDelegateCredentials,
  loginWithCredentials,
  storeSession
} from "@/lib/auth";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

export function LoginPanel() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
  }, []);

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = loginWithCredentials(username, password);

    if (!session) {
      toast.error("Usuario o contrasena incorrectos.");
      return;
    }

    storeSession(session);
    toast.success(`Sesion iniciada como ${session.role === "admin" ? "admin" : "delegado"}.`);

    if (session.role === "admin") {
      router.push(
        nextPath.startsWith("/admin") || nextPath.startsWith("/delegado") || nextPath === "/equipo"
          ? nextPath
          : "/admin"
      );
      return;
    }

    router.push(nextPath.startsWith("/delegado") || nextPath === "/equipo" ? nextPath : "/delegado");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Acceso demo"
          title="Iniciar sesion"
          description="Este login es temporal para probar roles. Luego lo cambiaremos por Supabase Auth con usuarios reales."
        />

        <form className="mt-5 space-y-4" onSubmit={submitLogin}>
          <Field label="Usuario">
            <input
              className={inputClass}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin o delegado"
              autoComplete="username"
            />
          </Field>

          <Field label="Contrasena">
            <input
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contrasena"
              type="password"
              autoComplete="current-password"
            />
          </Field>

          <Button type="submit" className="w-full">
            <LogIn className="h-4 w-4" />
            Entrar
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-field/10 text-field">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ink">Administrador</p>
                <Badge tone="green">Control total</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/65">
                Usuario: <strong>{demoAdminCredentials.username}</strong>
              </p>
              <p className="mt-1 text-sm text-ink/65">
                Contrasena: <strong>{demoAdminCredentials.password}</strong>
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/62">
                Puede entrar a admin, eventos, audio IA, vista publica y panel de delegado.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-sky/10 text-sky-900">
              <UserRoundCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ink">Delegado</p>
                <Badge tone="blue">Equipo</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/65">
                Usuario demo: <strong>{demoDelegateCredentials.username}</strong>
              </p>
              <p className="mt-1 text-sm text-ink/65">
                Contrasena demo: <strong>{demoDelegateCredentials.password}</strong>
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/62">
                Ademas, cuando un equipo termina su inscripcion, el PDF genera usuario y
                contrasena propios para el delegado.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-900">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-ink">Siguiente paso recomendado</p>
              <p className="mt-2 text-sm leading-6 text-ink/62">
                Cuando conectemos Supabase real, admin creara eventos y codigos; delegado
                vera su plantilla, constancia, horarios, observaciones y solicitudes de
                correccion, sin poder tocar resultados.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
