import { Trophy } from "lucide-react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { eventStatusLabel, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminChampionshipsPage() {
  const data = await getPublicCompetitionData();

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
          <Card key={event.id} className="p-5">
            <p className="font-bold text-ink">{event.name}</p>
            <p className="mt-1 text-sm text-ink/55">{event.category}</p>
            <div className="mt-4 space-y-1 text-sm text-ink/65">
              <p>{eventStatusLabel(event.status)}</p>
              <p>{formatMoney(event.registrationFee)}</p>
              <p>{event.maxTeams} equipos max.</p>
            </div>
            <Button href={`/admin/campeonatos/${event.id}`} variant="secondary" className="mt-4 w-full">
              Configurar
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
