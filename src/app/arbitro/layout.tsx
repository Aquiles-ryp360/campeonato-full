import { RefereeShell } from "@/components/shell";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export default async function RefereeLayout({ children }: { children: React.ReactNode }) {
  await requireServerRole("referee", "/arbitro");

  return <RefereeShell>{children}</RefereeShell>;
}
