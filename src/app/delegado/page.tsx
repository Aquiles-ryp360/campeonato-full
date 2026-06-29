import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegatePage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });

  return <DelegateDashboard initialData={data} />;
}
