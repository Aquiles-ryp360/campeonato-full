import { CrossEventClashPanel } from "@/features/admin/components/CrossEventClashPanel";
import { GroupDrawPanel } from "@/features/admin/components/GroupDrawPanel";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

// Pagina simple para el dia del sorteo: ruleta, PDF y cruces entre disciplinas.
export default async function AdminDrawPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <GroupDrawPanel data={data} />
      <CrossEventClashPanel data={data} />
    </div>
  );
}
