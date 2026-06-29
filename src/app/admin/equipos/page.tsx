import { TeamsReviewTable } from "@/features/admin/components/TeamsReviewTable";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return <TeamsReviewTable data={data} />;
}
