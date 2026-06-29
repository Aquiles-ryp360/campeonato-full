import { ChampionshipWizard } from "@/features/admin/components/ChampionshipWizard";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function EditChampionshipPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, data] = await Promise.all([params, getPublicCompetitionData()]);
  const event = data.events.find((item) => item.id === id);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title={event?.name ?? "Campeonato"}
          description="Edicion preparada sobre el wizard. Persistencia completa depende de tablas Supabase."
          action={<Badge tone="blue">Compatibilidad</Badge>}
        />
      </Card>
      <ChampionshipWizard data={data} />
    </div>
  );
}
