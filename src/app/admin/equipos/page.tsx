import { AdminTeamRegistrationForm } from "@/features/admin/components/AdminTeamRegistrationForm";
import { TeamsReviewTable } from "@/features/admin/components/TeamsReviewTable";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return (
    <div className="space-y-6">
      <AdminTeamRegistrationForm events={data.events} />
      <TeamsReviewTable data={data} />
    </div>
  );
}
