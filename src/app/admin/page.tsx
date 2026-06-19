import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminShell } from "@/components/shell";

export default function AdminPage() {
  return (
    <AdminShell>
      <AdminDashboard />
    </AdminShell>
  );
}
