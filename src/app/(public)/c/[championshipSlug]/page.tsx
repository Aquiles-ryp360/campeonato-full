import { RegistrationLanding } from "@/features/public/components/RegistrationLanding";
import { getPublicEvents } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function ChampionshipPage() {
  const data = await getPublicCompetitionData();
  return <RegistrationLanding events={getPublicEvents(data)} />;
}
