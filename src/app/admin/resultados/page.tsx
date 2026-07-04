import { ResultEntryPanel } from "@/features/admin/components/ResultEntryPanel";
import { getAdminResultAuditLogs } from "@/lib/queries/admin-results";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const [data, auditLogs] = await Promise.all([
    getPublicCompetitionData({ includePrivatePlayerFields: true }),
    getAdminResultAuditLogs()
  ]);

  return <ResultEntryPanel data={data} auditLogs={auditLogs} />;
}
