import { ChampionshipWizard } from "@/features/admin/components/ChampionshipWizard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function NewChampionshipPage() {
  const data = await getPublicCompetitionData();
  return <ChampionshipWizard data={data} />;
}
