"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Download, Info, KeyRound, MessageCircle } from "lucide-react";
import type { TournamentEvent } from "@/lib/types";
import { registrationAvailability } from "@/lib/domain/registration-rules";
import { Card, SectionHeader } from "@/components/ui";
import { SportIcon } from "./AccessCodeGate";
import { OrganizerContacts } from "./OrganizerContacts";

const registrationSteps = [
  { icon: MessageCircle, title: "Escribe a un organizador", text: "Pide información y realiza el pago." },
  { icon: KeyRound, title: "Recibe tu código", text: "Se entrega tras verificar el pago." },
  { icon: ClipboardCheck, title: "Completa la inscripción", text: "Valida el código y registra tu equipo." }
];

const sportCtaLabels: Partial<Record<TournamentEvent["sport"], string>> = {
  futsal: "Inscribirse en Futsal",
  voley: "Inscribirse en Vóley"
};

export function RegistrationCallout({ events }: { events: TournamentEvent[] }) {
  const openBySport = useMemo(() => {
    const result: TournamentEvent[] = [];
    for (const event of events) {
      if (!sportCtaLabels[event.sport]) continue;
      if (result.some((current) => current.sport === event.sport)) continue;
      if (registrationAvailability({ event }).open) result.push(event);
    }
    return result;
  }, [events]);
  const [contactSport, setContactSport] = useState<TournamentEvent["sport"] | undefined>(
    openBySport[0]?.sport
  );

  return (
    <section id="inscripciones" className="scroll-mt-24">
    <Card className="p-5 sm:p-6">
      <SectionHeader
        eyebrow={openBySport.length > 0 ? "Antes de inscribirte" : "Informes"}
        title={openBySport.length > 0 ? "¿Aún no tienes tu código?" : "Habla con un organizador"}
        description={
          openBySport.length > 0
            ? "Sigue estos 3 pasos. Con el código ya puedes usar los botones de inscripción de arriba."
            : "Las inscripciones están cerradas. Para cualquier consulta escribe por WhatsApp."
        }
      />

      {openBySport.length > 0 ? (
      <ol className="mt-5 grid gap-2 sm:grid-cols-3">
        {registrationSteps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-md border border-brand-towerMid/25 bg-brand-wash p-3"
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand-electric shadow-insetLine">
              <step.icon className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-yellow text-[10px] font-black text-brand-navy">
                {index + 1}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-ink">{step.title}</span>
              <span className="block text-xs leading-5 text-brand-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black uppercase text-ink">WhatsApp de organizadores</h3>
          {openBySport.length > 1 ? (
            <div className="inline-flex rounded-md border border-brand-towerMid/25 bg-brand-wash p-1" role="group" aria-label="Disciplina del mensaje">
              {openBySport.map((event) => {
                const selected = event.sport === contactSport;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setContactSport(event.sport)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition ${
                      selected ? "bg-white text-brand-navy shadow-sm" : "text-brand-muted"
                    }`}
                  >
                    <SportIcon sport={event.sport} className="h-3.5 w-3.5" />
                    {event.sport === "voley" ? "Vóley" : "Futsal"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="mt-3">
          <OrganizerContacts sport={contactSport} />
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-brand-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          El código de acceso será proporcionado por un organizador después de verificar tu pago.
        </p>
        <a
          href="/afiche-campeonato.jpg"
          download="afiche-campeonato.jpg"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-electric hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar afiche oficial para compartir
        </a>
      </div>
    </Card>
    </section>
  );
}
