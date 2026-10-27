import { ChampionshipWizard } from "@/features/admin/components/ChampionshipWizard";
import { Button, Card, SectionHeader } from "@/components/ui";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function EditChampionshipPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, data] = await Promise.all([
    params,
    getPublicCompetitionData({ includePrivatePlayerFields: true })
  ]);
  const event = data.events.find((item) => item.id === id);

  if (!event) {
    return (
      <Card className="p-5">
        <SectionHeader
          title="Campeonato no encontrado"
          description="Puede que haya sido borrado. Vuelve a la lista de campeonatos."
          action={<Button href="/admin/campeonatos" variant="secondary">Ver campeonatos</Button>}
        />
      </Card>
    );
  }

  return <ChampionshipWizard key={id} data={data} initialEvent={event} />;
}
