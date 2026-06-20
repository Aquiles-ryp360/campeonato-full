import { DelegateShell } from "@/components/shell";
import { TeamPortal } from "@/components/team-portal";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const data = await getPublicCompetitionData();

  return (
    <DelegateShell>
      <TeamPortal initialData={data} />
    </DelegateShell>
  );
}
