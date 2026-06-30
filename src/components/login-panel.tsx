"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, Mail, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  demoAdminCredentials,
  demoDelegateCredentials,
  loginWithCredentials,
  storeSession
} from "@/lib/auth";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

const loginErrorMessages: Record<string, string> = {
  missing_email: "Google no devolvio un correo valido.",
  not_authorized: "Este correo no esta autorizado para entrar.",
  not_registered: "Este correo no coincide con ningun delegado inscrito.",
  registration_pending: "Tu inscripcion continua en revision. El panel se habilitara cuando administracion apruebe tu equipo.",
  oauth_access_failed: "No se pudo validar el acceso con Supabase.",
  oauth_exchange_failed: "No se pudo completar el login con Google.",
  oauth_missing_code: "Google no envio el codigo de acceso.",
  oauth_user_missing: "No se pudo leer el usuario autenticado.",
  supabase_not_configured: "Supabase no esta configurado en el servidor."
};

export function LoginPanel() {
  const router = useRouter();
  const supabaseConfigured = hasSupabaseEnv();
  const [nextPath, setNextPath] = useState("/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isMagicSubmitting, setIsMagicSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/";
    const error = params.get("error");

    setNextPath(next);

    if (error) {
      toast.error(loginErrorMessages[error] ?? "No se pudo iniciar sesion.");
    }
  }, []);

  async function startGoogleLogin() {
    if (!supabaseConfigured) {
      toast.error("Supabase no esta configurado.");
      return;
    }

    setIsGoogleSubmitting(true);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      const safeNextPath = sanitizeNextPath(nextPath);

      if (safeNextPath !== "/") {
        callbackUrl.searchParams.set("next", safeNextPath);
      }

      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (error) {
        toast.error("No se pudo abrir el login con Google.");
        setIsGoogleSubmitting(false);
      }
    } catch {
      toast.error("No se pudo iniciar sesion con Google.");
      setIsGoogleSubmitting(false);
    }
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseConfigured) {
      toast.error("Supabase no esta configurado.");
      return;
    }

    const email = magicEmail.trim().toLowerCase();

    if (!email) {
      toast.error("Ingresa el correo registrado durante la inscripcion.");
      return;
    }

    setIsMagicSubmitting(true);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      const safeNextPath = sanitizeNextPath(nextPath);

      if (safeNextPath !== "/") {
        callbackUrl.searchParams.set("next", safeNextPath);
      }

      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true
        }
      });

      if (error) {
        toast.error("No se pudo enviar el enlace de acceso.");
        return;
      }

      toast.success("Enlace enviado. Revisa tu correo para entrar.");
    } catch {
      toast.error("No se pudo enviar el enlace de acceso.");
    } finally {
      setIsMagicSubmitting(false);
    }
  }

  function submitDemoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

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
        nextPath.startsWith("/admin") || nextPath.startsWith("/delegado")
          ? nextPath
          : "/admin"
      );
      setIsSubmitting(false);
      return;
    }

    router.push(nextPath.startsWith("/delegado") ? nextPath : "/delegado");
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Acceso"
          title="Iniciar sesion"
          description={
            supabaseConfigured
              ? "Entra con el mismo correo usado en la inscripcion."
              : "Modo demo local sin Supabase: usa las credenciales de prueba."
          }
        />

        {supabaseConfigured ? (
          <div className="mt-5 space-y-4">
            <form className="space-y-3" onSubmit={sendMagicLink}>
              <Field label="Correo registrado">
                <input
                  className={inputClass}
                  value={magicEmail}
                  onChange={(event) => setMagicEmail(event.target.value)}
                  placeholder="delegado@correo.com"
                  type="email"
                  autoComplete="email"
                />
              </Field>
              <Button type="submit" className="w-full" disabled={isMagicSubmitting}>
                <Mail className="h-4 w-4" />
                {isMagicSubmitting ? "Enviando enlace..." : "Enviar enlace de acceso"}
              </Button>
            </form>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              onClick={startGoogleLogin}
              disabled={isGoogleSubmitting}
            >
              <Mail className="h-4 w-4" />
              {isGoogleSubmitting ? "Abriendo Google..." : "Entrar con Google"}
            </Button>
            <p className="text-sm leading-6 text-ink/62">
              Si eres delegado, el correo debe coincidir con el registrado en la
              inscripcion y el equipo debe estar aprobado. Si eres admin, tu correo debe
              estar autorizado en Supabase.
            </p>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={submitDemoLogin}>
            <Field label="Usuario">
              <input
                className={inputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin o delegado"
                type="text"
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
        )}
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
              {supabaseConfigured ? (
                <p className="mt-3 text-sm leading-6 text-ink/62">
                  El admin entra con Google solo si su correo esta registrado como
                  administrador en el sistema.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink/65">
                    Usuario demo: <strong>{demoAdminCredentials.username}</strong>
                  </p>
                  <p className="mt-1 text-sm text-ink/65">
                    Contrasena: <strong>{demoAdminCredentials.password}</strong>
                  </p>
                </>
              )}
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
              {supabaseConfigured ? (
                <p className="mt-3 text-sm leading-6 text-ink/62">
                  El delegado usa el mismo correo que dejo en la inscripcion. Al aprobarse
                  el equipo, el sistema habilita el panel y vincula su usuario con su equipo.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink/65">
                    Usuario demo: <strong>{demoDelegateCredentials.username}</strong>
                  </p>
                  <p className="mt-1 text-sm text-ink/65">
                    Contrasena demo: <strong>{demoDelegateCredentials.password}</strong>
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-900">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-ink">Seguridad</p>
              <p className="mt-2 text-sm leading-6 text-ink/62">
                Tener Gmail no da acceso automatico. El correo debe estar inscrito como
                delegado o autorizado como administrador.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function sanitizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
