import { MessageCircle, Phone } from "lucide-react";
import { buildOrganizerContactLinks, type RegistrationSport } from "@/lib/payment-contact";

export function OrganizerContacts({
  sport,
  teamName
}: {
  sport?: RegistrationSport;
  teamName?: string;
}) {
  const contacts = buildOrganizerContactLinks(sport, teamName);

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {contacts.map((contact, index) => (
        <li key={contact.phone}>
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Escribir por WhatsApp al organizador ${index + 1}: ${contact.displayPhone}`}
            className="group flex min-h-14 items-center gap-3 rounded-md border border-brand-towerMid/25 bg-white p-3 shadow-insetLine transition hover:border-[#25D366] hover:shadow-lift focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-wash text-brand-navy">
              <Phone className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-brand-muted">
                Organizador {index + 1}
              </span>
              <span className="block text-base font-black tracking-wide text-ink">
                {contact.displayPhone}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition group-hover:bg-[#1ebe5b]">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
