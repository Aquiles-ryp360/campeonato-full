import { PublicHome } from "@/features/public/components/PublicHome";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicCompetitionData();
  return <PublicHome data={data} />;
}
