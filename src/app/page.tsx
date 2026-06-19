import { PublicShell } from "@/components/shell";
import { PublicDashboard } from "@/components/public-dashboard";

export default function HomePage() {
  return (
    <PublicShell>
      <PublicDashboard />
    </PublicShell>
  );
}
