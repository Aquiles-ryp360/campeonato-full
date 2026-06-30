import { RegistrationForm } from "@/components/registration-form";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipRegistrationPage({
  params,
  searchParams
}: {
  params: Promise<{ championshipSlug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ championshipSlug }, { category }, data] = await Promise.all([
    params,
    searchParams,
    getPublicCompetitionData()
  ]);
  const context = getChampionshipPublicContext(data, championshipSlug, category);

  return (
    <RegistrationForm
      events={context.events}
      categories={context.categories}
      initialEventId={context.event?.id}
      initialCategoryId={context.selectedCategory?.id}
    />
  );
}
