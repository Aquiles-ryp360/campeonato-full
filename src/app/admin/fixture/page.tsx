import { CrossEventClashPanel } from "@/features/admin/components/CrossEventClashPanel";
import { FixtureGenerationPanel } from "@/features/admin/components/FixtureGenerationPanel";
import { GroupDrawPanel } from "@/features/admin/components/GroupDrawPanel";
import { MatchOrderEditor } from "@/features/admin/components/MatchOrderEditor";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminFixturePage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return (
    <div className="space-y-6">
      <GroupDrawPanel data={data} />
      <MatchOrderEditor data={data} />
      <CrossEventClashPanel data={data} />
      <FixtureGenerationPanel data={data} />
    </div>
  );
}
