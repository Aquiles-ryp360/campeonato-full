import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });

  return <AdminDashboard data={data} />;
}
