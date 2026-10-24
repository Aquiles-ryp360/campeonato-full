import { RegistrationLanding } from "@/features/public/components/RegistrationLanding";
import { getPublicEvents } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

// Portada publica: solo inscripcion. El resto se ve en el panel del delegado.
export default async function HomePage() {
  const data = await getPublicCompetitionData();
  return <RegistrationLanding events={getPublicEvents(data)} />;
}
