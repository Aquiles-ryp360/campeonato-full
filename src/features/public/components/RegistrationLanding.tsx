import Link from "next/link";
import { ChevronDown, ChevronRight, LogIn, Timer } from "lucide-react";
import type { TournamentEvent } from "@/lib/types";
import { registrationAvailability } from "@/lib/domain/registration-rules";
import { Card, SectionHeader } from "@/components/ui";
import { formatMoney, sportLabel } from "@/lib/utils";
import { championshipSlug } from "@/lib/domain/tournament-format";
import { RegistrationCallout } from "@/features/registration/components/RegistrationCallout";
import { SportIcon } from "@/features/registration/components/AccessCodeGate";

const sportNames: Record<TournamentEvent["sport"], string> = {
  futsal: "Futsal",
  voley: "Vóley",
  futbol: "Fútbol"
};

const closingFormatter = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima"
});

function nextClosing(events: TournamentEvent[]) {
  const times = events
    .map((event) => new Date(event.registrationOpenUntil).getTime())
    .filter((time) => Number.isFinite(time));
  if (times.length === 0) return null;

  const time = Math.min(...times);
  return {
    days: Math.max(0, Math.floor((time - Date.now()) / 86_400_000)),
    label: closingFormatter.format(new Date(time))
  };
}

function buildFaq(events: TournamentEvent[]) {
  const priced = events.filter((event) => event.registrationFee > 0);
  return [
    priced.length > 0
      ? {
          question: "¿Cuánto cuesta la inscripción?",
          answer: priced.map((event) => `${sportLabel(event.sport)}: ${formatMoney(event.registrationFee)}`).join(" · ")
        }
      : null,
    events.length > 0
      ? {
          question: "¿Cuántos jugadores puedo inscribir?",
          answer: events
            .map((event) => `${sportLabel(event.sport)}: de ${event.minPlayers} a ${event.maxPlayers} jugadores`)
            .join(" · ")
        }
      : null,
    {
      question: "¿Cómo realizo el pago?",
      answer:
        "Escribe a un organizador por WhatsApp. Te indicará cómo pagar por Yape o Plin y, al verificar el pago, te entregará tu código de acceso."
    },
    {
      question: "¿Para qué sirve el código de acceso?",
      answer:
        "Habilita el formulario de inscripción de tu equipo. Es de un solo uso: una vez registrado el equipo, no se puede volver a utilizar."
    },
    {
      question: "¿Dónde y a qué hora se juega?",
      answer:
        "El fixture, los horarios y la ubicación de la sede se publican en el panel del delegado, solo para equipos inscritos."
    },
    {
      question: "¿Cómo entro a mi panel de delegado?",
      answer:
        "Pulsa “Ingresar” y entra con Google usando el mismo Gmail del delegado que registraste en la inscripción."
    }
  ].filter((item): item is { question: string; answer: string } => item !== null);
}

function joinWithAnd(items: string[]) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}` : items[0];
}

export function RegistrationLanding({ events }: { events: TournamentEvent[] }) {
  const openEvents = events.filter((event) => registrationAvailability({ event }).open);
  const hasOpenRegistration = openEvents.length > 0;
  const closing = nextClosing(openEvents);
  const faq = buildFaq(hasOpenRegistration ? openEvents : events);
  const sports = Array.from(
    new Set((hasOpenRegistration ? openEvents : events).map((event) => sportNames[event.sport]))
  );
  // Un boton por disciplina abierta (el primer campeonato de cada deporte).
  const openBySport = openEvents.filter(
    (event, index) => openEvents.findIndex((other) => other.sport === event.sport) === index
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="relative overflow-hidden rounded-lg bg-technical-blue text-white shadow-panel">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 opacity-20"
          style={{
            background:
              "repeating-linear-gradient(135deg, transparent 0 18px, rgba(240,232,52,0.45) 18px 20px, transparent 20px 38px)"
          }}
        />
        <div className="relative p-6 sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${hasOpenRegistration ? "bg-green-400" : "bg-red-400"}`}
            />
            {hasOpenRegistration ? "Inscripciones abiertas" : "Inscripciones cerradas"}
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase italic leading-[0.9] tracking-tight sm:text-7xl">
            {hasOpenRegistration ? (
              <>
                Inscribe a tu <span className="text-brand-yellow">equipo</span>
              </>
            ) : (
              <>
                Campeonato <span className="text-brand-yellow">EPIME</span>
              </>
            )}
          </h1>
          {sports.length > 0 ? (
            <p className="mt-3 text-lg font-bold text-white/90">Disciplinas: {joinWithAnd(sports)}</p>
          ) : null}
          {closing ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-yellow px-3 py-1.5 text-sm font-black text-brand-navy">
              <Timer className="h-4 w-4" />
              {closing.days > 1 ? `Faltan ${closing.days} días` : closing.days === 1 ? "Falta 1 día" : "Último día"} · cierra el{" "}
              {closing.label}
            </p>
          ) : null}

          {openBySport.length > 0 ? (
            <div id="inscribir" className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
              {openBySport.map((event) => (
                <Link
                  key={event.id}
                  href={`/c/${championshipSlug(event)}/registro`}
                  className="group flex min-h-16 items-center gap-3 rounded-md bg-brand-yellow p-4 text-brand-navy shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-yellowHover focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-navy text-brand-yellow">
                    <SportIcon sport={event.sport} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black">Inscribir en {sportNames[event.sport]}</span>
                    <span className="block text-xs font-bold">
                      {event.registrationFee > 0 ? `${formatMoney(event.registrationFee)} · ` : ""}
                      Necesitas tu código de acceso
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href="/login?next=%2Fdelegado"
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-black transition ${
                hasOpenRegistration
                  ? "text-white ring-1 ring-white/30 hover:bg-white/10"
                  : "bg-brand-yellow text-brand-navy shadow-lift hover:bg-brand-yellowHover"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Ya me inscribí · Ingresar a mi panel
            </a>
            <p className="text-xs text-white/70 sm:max-w-sm">
              En tu panel de delegado: fixture y horarios, bases, sede y mapa, grupos, llaves y resultados. Entra con el Gmail del delegado.
            </p>
          </div>
        </div>
      </section>

      <RegistrationCallout events={events} />

      <Card className="p-5 sm:p-6">
        <SectionHeader eyebrow="Antes de inscribirte" title="Preguntas frecuentes" />
        <div className="mt-5 divide-y divide-brand-towerMid/25 rounded-md border border-brand-towerMid/25">
          {faq.map((item) => (
            <details key={item.question} className="group px-4 py-3 open:bg-brand-wash/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
