import { CalendarDays, ChevronDown, FileText, LockKeyhole, LogIn, MapPin, Timer, Trophy, UserPlus } from "lucide-react";
import type { TournamentEvent } from "@/lib/types";
import { registrationAvailability } from "@/lib/domain/registration-rules";
import { Card, SectionHeader } from "@/components/ui";
import { formatMoney, sportLabel } from "@/lib/utils";
import { RegistrationCallout } from "@/features/registration/components/RegistrationCallout";

const reservedItems = [
  { icon: CalendarDays, title: "Fixture y horarios", text: "Rivales, canchas y horas de cada partido." },
  { icon: FileText, title: "Bases del campeonato", text: "Reglamento oficial y documentos." },
  { icon: MapPin, title: "Sede y mapa", text: "Ubicación exacta y cómo llegar." },
  { icon: Trophy, title: "Equipos y llaves", text: "Grupos, posiciones y resultados." }
];

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
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${hasOpenRegistration ? "bg-green-400" : "bg-red-400"}`}
              />
              {hasOpenRegistration ? "Inscripciones abiertas" : "Inscripciones cerradas"}
            </p>
            <h1 className="mt-5 font-display text-6xl font-extrabold uppercase italic leading-[0.9] tracking-tight sm:text-8xl">
              Inscribe a tu <span className="block text-brand-yellow">equipo</span>
            </h1>
            {sports.length > 0 ? (
              <p className="mt-4 text-lg font-bold text-white/90 sm:text-xl">
                Disciplinas: {joinWithAnd(sports)}
              </p>
            ) : null}
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              Pide tu código por WhatsApp, paga y registra a tu equipo. El fixture, las bases y la sede se
              comparten solo con los delegados inscritos.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a
                href="#inscripciones"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand-yellow px-5 py-3 text-sm font-black text-brand-navy shadow-lift transition duration-200 hover:-translate-y-0.5 hover:bg-brand-yellowHover active:translate-y-0"
              >
                <UserPlus className="h-4 w-4" />
                Inscribir mi equipo
              </a>
              <a
                href="/login?next=%2Fdelegado"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/10"
              >
                <LogIn className="h-4 w-4" />
                Ya me inscribí · Ingresar
              </a>
            </div>
          </div>

          {closing ? (
            <div
              className="animate-rise rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur [animation-delay:120ms]"
              aria-label="Cierre de inscripciones"
            >
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-yellow">
                <Timer className="h-4 w-4" />
                Cierre de inscripciones
              </p>
              <p className="mt-3 font-display text-8xl font-extrabold italic leading-none sm:text-9xl">
                {closing.days > 0 ? closing.days : "¡Hoy!"}
              </p>
              <p className="mt-1 text-lg font-bold">
                {closing.days === 1 ? "día restante" : closing.days > 1 ? "días restantes" : "Último día para inscribirte"}
              </p>
              <p className="mt-4 border-t border-white/15 pt-4 text-sm text-white/70">
                Cierra el <strong className="text-white">{closing.label}</strong>. Los cupos son limitados.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <RegistrationCallout events={events} />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-brand-electric">
              <LockKeyhole className="h-3.5 w-3.5" />
              Exclusivo para equipos inscritos
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight text-ink">Tu panel de delegado</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-muted">
              Después de inscribirte, entra con el Gmail del delegado para ver toda la información del
              campeonato.
            </p>
          </div>
          <a
            href="/login?next=%2Fdelegado"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-electric px-4 py-2 text-sm font-bold text-white shadow-lift transition hover:bg-brand-institutional"
          >
            <LogIn className="h-4 w-4" />
            Ingresar a mi panel
          </a>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {reservedItems.map((item) => (
            <li
              key={item.title}
              className="relative rounded-md border border-brand-towerMid/25 bg-brand-wash p-4"
            >
              <LockKeyhole className="absolute right-3 top-3 h-3.5 w-3.5 text-brand-muted/60" />
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-navy shadow-insetLine">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-black text-ink">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-brand-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </Card>

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
