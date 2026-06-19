"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  createSession,
  demoAdminCredentials,
  demoDelegateCredentials,
  loginWithCredentials,
  storeSession
} from "@/lib/auth";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

export function LoginPanel() {
  const router = useRouter();
  const supabaseConfigured = hasSupabaseEnv();
  const [nextPath, setNextPath] = useState("/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    if (supabaseConfigured) {
      try {
        const supabase = createSupabaseBrowserClient();
        const email = username.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data.user) {
          toast.error("Correo o contrasena incorrectos.");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          toast.error("Tu usuario no tiene perfil asignado.");
          return;
        }

        if (profile.role !== "admin" && profile.role !== "delegate") {
          await supabase.auth.signOut();
          toast.error("Tu usuario no tiene permisos para este sistema.");
          return;
        }

        const session = createSession(
          profile.role,
          email,
          profile.full_name ?? data.user.email ?? "Usuario"
        );

        storeSession(session);
        toast.success(`Sesion iniciada como ${session.role === "admin" ? "admin" : "delegado"}.`);

        if (session.role === "admin") {
          router.push(
            nextPath.startsWith("/admin") ||
              nextPath.startsWith("/delegado") ||
              nextPath === "/equipo"
              ? nextPath
              : "/admin"
          );
          return;
        }

        router.push(
          nextPath.startsWith("/delegado") || nextPath === "/equipo" ? nextPath : "/delegado"
        );
        return;
      } catch {
        toast.error("No se pudo iniciar sesion con Supabase.");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const session = loginWithCredentials(username, password);

    if (!session) {
      toast.error("Usuario o contrasena incorrectos.");
      setIsSubmitting(false);
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
      setIsSubmitting(false);
      return;
    }

    router.push(nextPath.startsWith("/delegado") || nextPath === "/equipo" ? nextPath : "/delegado");
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Acceso"
          title="Iniciar sesion"
          description="Ingresa con el correo y la contrasena temporal enviada al delegado o con un usuario admin creado en Supabase."
        />

        <form className="mt-5 space-y-4" onSubmit={submitLogin}>
          <Field label="Correo">
            <input
              className={inputClass}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={supabaseConfigured ? "delegado@correo.com" : "admin o delegado"}
              type={supabaseConfigured ? "email" : "text"}
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Entrando..." : "Entrar"}
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
                Usuario demo: <strong>{demoAdminCredentials.username}</strong>
              </p>
              <p className="mt-1 text-sm text-ink/65">
                Contrasena: <strong>{demoAdminCredentials.password}</strong>
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/62">
                El demo solo funciona si las variables publicas de Supabase no estan configuradas.
                En produccion usa un usuario admin real de Supabase.
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
                Cuando un equipo termina su inscripcion, el servidor crea el usuario con su correo
                y envia la contrasena temporal automaticamente.
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
