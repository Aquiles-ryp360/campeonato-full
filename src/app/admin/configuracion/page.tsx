import { BasesUploadForm } from "@/features/admin/components/BasesUploadForm";
import { FormatConfigForm } from "@/features/admin/components/FormatConfigForm";
import { ScheduleConfigForm } from "@/features/admin/components/ScheduleConfigForm";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <FormatConfigForm />
      <ScheduleConfigForm />
      <BasesUploadForm />
    </div>
  );
}
