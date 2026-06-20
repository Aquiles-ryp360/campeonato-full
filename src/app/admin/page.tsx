import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminShell } from "@/components/shell";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getPublicCompetitionData();

  return (
    <AdminShell>
      <AdminDashboard initialData={data} />
    </AdminShell>
  );
}
