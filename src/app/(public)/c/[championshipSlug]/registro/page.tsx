import { RegistrationForm } from "@/components/registration-form";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipRegistrationPage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const [{ championshipSlug }, data] = await Promise.all([params, getPublicCompetitionData()]);
  const context = getChampionshipPublicContext(data, championshipSlug);

  return <RegistrationForm events={context.events} initialEventId={context.event?.id} />;
}
