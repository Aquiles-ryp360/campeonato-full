import { FixtureGenerationPanel } from "@/features/admin/components/FixtureGenerationPanel";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminFixturePage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return <FixtureGenerationPanel data={data} />;
}
