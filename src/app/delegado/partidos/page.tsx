import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegateMatchesPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return <DelegateDashboard initialData={data} view="matches" />;
}
