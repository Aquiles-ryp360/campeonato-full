import { AdminShell } from "@/components/shell";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireServerRole("admin", "/admin");

  return <AdminShell>{children}</AdminShell>;
}
