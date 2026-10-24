import { PublicHome } from "@/features/public/components/PublicHome";
import { requireServerRole } from "@/lib/server-page-access";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegateChampionshipPage() {
  await requireServerRole("delegate", "/delegado/campeonato");
  const data = await getPublicCompetitionData();
  return <PublicHome data={data} />;
}
