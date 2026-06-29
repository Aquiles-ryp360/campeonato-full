import { BasesUploadForm } from "@/features/admin/components/BasesUploadForm";
import { FormatConfigForm } from "@/features/admin/components/FormatConfigForm";
import { ScheduleConfigForm } from "@/features/admin/components/ScheduleConfigForm";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <FormatConfigForm />
      <ScheduleConfigForm venues={data.venues} />
      <BasesUploadForm />
    </div>
  );
}
