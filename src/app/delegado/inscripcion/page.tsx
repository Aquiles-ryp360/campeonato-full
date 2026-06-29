import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegateRegistrationPage() {
  const data = await getPublicCompetitionData();
  return <DelegateDashboard initialData={data} view="registration" />;
}
