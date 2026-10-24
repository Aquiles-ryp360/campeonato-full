"use client";

import { useState } from "react";
import {
  AlertCircle,
  Goal,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trophy,
  Volleyball
} from "lucide-react";
import type { TournamentEvent } from "@/lib/types";
import { sportLabel } from "@/lib/utils";
import { Card, Field, inputClass } from "@/components/ui";
import { OrganizerContacts } from "./OrganizerContacts";

type ValidateCodeResponse =
  | { ok: true; paymentMethod: "yape" | "plin" }
  | { ok: false; error: string };

export function SportIcon({
  sport,
  className
}: {
  sport: TournamentEvent["sport"];
  className?: string;
}) {
  if (sport === "voley") return <Volleyball className={className} />;
  if (sport === "futsal") return <Goal className={className} />;
  return <Trophy className={className} />;
}

export function AccessCodeGate({
  events,
  event,
  primaryColor,
  initialCode = "",
  onEventChange,
  onValidated
}: {
  events: TournamentEvent[];
  event: TournamentEvent;
  primaryColor: string;
  initialCode?: string;
  onEventChange: (eventId: string) => void;
  onValidated: (code: string, paymentMethod: "yape" | "plin") => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  async function validateCode(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length < 3) {
      setError("Ingresa tu código de acceso.");
      return;
    }

    setIsValidating(true);
    setError("");
    try {
      const response = await fetch("/api/registration-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, registrationCode: normalizedCode })
      });
      const payload = (await response.json().catch(() => null)) as ValidateCodeResponse | null;

      if (!payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error : "No se pudo validar el código.");
        return;
      }

      onValidated(normalizedCode, payload.paymentMethod);
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20 md:pb-0">
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
        <form className="p-5 sm:p-6" onSubmit={validateCode} noValidate>
          <div className="flex items-start gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-brand-muted">
                <SportIcon sport={event.sport} className="h-4 w-4" />
                {sportLabel(event.sport)}
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight text-ink sm:text-4xl">
                Código de acceso para inscripción
              </h1>
              <p className="mt-2 text-sm leading-6 text-brand-muted">
                Para completar tu inscripción, primero debes realizar el pago correspondiente y
                solicitar tu código de acceso a uno de nuestros organizadores.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {events.length > 1 ? (
              <Field label="Campeonato">
                <select
                  className={inputClass}
                  value={event.id}
                  onChange={(changeEvent) => {
                    setError("");
                    onEventChange(changeEvent.target.value);
                  }}
                  disabled={isValidating}
                >
                  {events.map((current) => (
                    <option key={current.id} value={current.id}>
                      {current.name} - {sportLabel(current.sport)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Ingresa tu código de acceso">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <input
                  className={`${inputClass} pl-9 font-mono text-base uppercase tracking-wider`}
                  value={code}
                  onChange={(changeEvent) => {
                    setCode(changeEvent.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Ej. CMP-FUTS-AB7K-9QX2"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                  aria-describedby="access-code-error"
                  disabled={isValidating}
                />
              </div>
            </Field>
            <div id="access-code-error" aria-live="polite">
              {error ? (
                <p className="flex items-start gap-2 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isValidating}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold text-white shadow-lift transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-electric focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isValidating ? "Validando código..." : "Validar código y continuar"}
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black text-ink">¿Todavía no tienes tu código?</h2>
        <p className="mt-1 text-sm leading-6 text-brand-muted">
          Escribe a uno de nuestros organizadores por WhatsApp para realizar el pago y solicitar tu
          código.
        </p>
        <div className="mt-4">
          <OrganizerContacts sport={event.sport} />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-md border border-brand-yellow/70 bg-brand-yellow/20 p-3 text-sm font-semibold text-brand-navy">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          El código de acceso será proporcionado por un organizador después de verificar tu pago.
        </p>
      </Card>
    </div>
  );
}
