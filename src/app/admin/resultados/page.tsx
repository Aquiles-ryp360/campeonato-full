import { ResultEntryPanel } from "@/features/admin/components/ResultEntryPanel";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const data = await getPublicCompetitionData();
  return <ResultEntryPanel data={data} />;
}
