import { RegistrationForm } from "@/components/registration-form";
import { PublicShell } from "@/components/shell";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const data = await getPublicCompetitionData();

  return (
    <PublicShell>
      <RegistrationForm events={data.events} />
    </PublicShell>
  );
}
