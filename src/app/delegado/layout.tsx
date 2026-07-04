import { DelegateShell } from "@/components/shell";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export default async function DelegateLayout({ children }: { children: React.ReactNode }) {
  await requireServerRole("delegate", "/delegado");

  return <DelegateShell>{children}</DelegateShell>;
}
