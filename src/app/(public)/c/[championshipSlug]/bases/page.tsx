import { PublicBasesPage } from "@/features/bases/components/PublicBasesPage";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export default async function ChampionshipBasesPage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const { championshipSlug } = await params;
  // Solo equipos inscritos, arbitros y admin.
  await requireServerRole("member", `/c/${championshipSlug}/bases`);
  const data = await getPublicCompetitionData();
  return <PublicBasesPage data={data} initialChampionship={championshipSlug} />;
}
