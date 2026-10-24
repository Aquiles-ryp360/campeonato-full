import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { getAnnouncements } from "@/lib/server/announcements";
import { requireServerRole } from "@/lib/server-page-access";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegateNoticesPage() {
  await requireServerRole("delegate", "/delegado/avisos");
  const [data, announcements] = await Promise.all([
    getPublicCompetitionData({ includePrivatePlayerFields: true }),
    getAnnouncements()
  ]);
  return <DelegateDashboard initialData={data} view="notices" announcements={announcements} />;
}
