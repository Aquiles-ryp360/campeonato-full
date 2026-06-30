import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { DelegateAccessNotice } from "@/features/delegate/components/DelegateAccessNotice";
import { getDelegateRouteAccess } from "@/lib/delegate-route-access";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegateRosterPage() {
  const access = await getDelegateRouteAccess();

  if (!access.ok) {
    return <DelegateAccessNotice reason={access.reason} email={access.email} />;
  }

  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  return <DelegateDashboard initialData={data} view="roster" />;
}
