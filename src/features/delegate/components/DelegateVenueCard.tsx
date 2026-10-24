import { ExternalLink, MapPin, Navigation, ShieldCheck } from "lucide-react";
import type { ChampionshipVenue } from "@/lib/server/championship-venue";
import { Card } from "@/components/ui";

export function DelegateVenueCard({ venue }: { venue: ChampionshipVenue }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col justify-between gap-5 bg-technical-blue p-5 text-white sm:p-6">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold uppercase text-brand-yellow">
              <ShieldCheck className="h-3.5 w-3.5" />
              Solo equipos inscritos
            </p>
            <h2 className="mt-4 text-2xl font-black leading-tight">Sede del campeonato</h2>
            <p className="mt-3 flex items-start gap-2 text-base font-bold">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-yellow" />
              <span>
                {venue.name}
                <span className="block text-sm font-semibold text-white/70">{venue.address}</span>
              </span>
            </p>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Esta ubicación es reservada. Compártela solo con los jugadores de tu equipo.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-navy shadow-lift transition hover:bg-brand-yellowHover sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir en Google Maps
            </a>
            <a
              href={venue.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20 sm:w-auto"
            >
              <Navigation className="h-4 w-4" />
              Cómo llegar
            </a>
          </div>
        </div>
        <iframe
          title={`Mapa de ${venue.name}`}
          src={venue.embedUrl}
          className="h-64 w-full border-0 sm:h-80 lg:h-full lg:min-h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </Card>
  );
}
