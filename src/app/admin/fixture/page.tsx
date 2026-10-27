import { FixtureGenerationPanel } from "@/features/admin/components/FixtureGenerationPanel";
import { GroupDrawPanel } from "@/features/admin/components/GroupDrawPanel";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminFixturePage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return (
    <div className="space-y-6">
      <GroupDrawPanel data={data} />
      <FixtureGenerationPanel data={data} />
    </div>
  );
}
