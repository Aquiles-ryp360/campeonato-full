import { LockKeyhole, LogIn, MapPin, UserPlus } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function LockedVenueCard() {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23,27,79,1) 1px, transparent 1px), linear-gradient(90deg, rgba(23,27,79,1) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-navy text-brand-yellow shadow-lift">
          <MapPin className="h-7 w-7" />
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-brand-yellow text-brand-navy">
            <LockKeyhole className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-brand-electric">Sede del campeonato</p>
          <h2 className="mt-1 text-xl font-black text-ink">Ubicación reservada para equipos inscritos</h2>
          <p className="mt-1 text-sm leading-6 text-brand-muted">
            La dirección exacta y el mapa aparecen en el panel del delegado después de completar la
            inscripción.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button href="/login?next=%2Fdelegado" className="w-full sm:w-auto">
            <LogIn className="h-4 w-4" />
            Ya me inscribí
          </Button>
          <Button href="#inscripciones" variant="secondary" className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Inscribir equipo
          </Button>
        </div>
      </div>
    </Card>
  );
}
