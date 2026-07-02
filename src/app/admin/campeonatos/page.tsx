import { Trophy } from "lucide-react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { DeleteChampionshipButton } from "@/features/admin/components/DeleteChampionshipButton";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { eventStatusLabel, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminChampionshipsPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Admin"
        title="Campeonatos"
        description="Crea, revisa y configura campeonatos multi-deporte."
        action={
          <Button href="/admin/campeonatos/nuevo">
            <Trophy className="h-4 w-4" />
            Nuevo
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {data.events.map((event) => (
          <Card key={event.id} className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-electric/25 hover:shadow-lift">
            <p className="font-bold text-ink">{event.name}</p>
            <p className="mt-1 text-sm font-semibold text-brand-muted">{event.category}</p>
            <div className="mt-4 space-y-1 text-sm font-semibold text-brand-muted">
              <p>{eventStatusLabel(event.status)}</p>
              <p>{formatMoney(event.registrationFee)}</p>
              <p>{event.maxTeams} equipos max.</p>
            </div>
            <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
              <Button href={`/admin/campeonatos/${event.id}`} variant="secondary" className="w-full">
                Configurar
              </Button>
              <DeleteChampionshipButton id={event.id} name={event.name} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
