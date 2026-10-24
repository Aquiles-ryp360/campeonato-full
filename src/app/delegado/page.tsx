import { DelegateDashboard } from "@/features/delegate/components/DelegateDashboard";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { getDelegateTeamContext } from "@/lib/queries/delegate";
import { getChampionshipVenue } from "@/lib/server/championship-venue";
import { getAnnouncements } from "@/lib/server/announcements";
import { requireServerRole } from "@/lib/server-page-access";
import { getPublicCompetitionData } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export default async function DelegatePage() {
  // La sede es privada: se verifica la sesion aqui ademas del layout.
  const access = await requireServerRole("delegate", "/delegado");
  const [data, announcements] = await Promise.all([
    getPublicCompetitionData({ includePrivatePlayerFields: true }),
    getAnnouncements()
  ]);
  const hasActiveTeam =
    access.bypassed ||
    access.role === "admin" ||
    getDelegateTeamContext(data, undefined, access.user?.email?.toLowerCase()).delegateTeams.some(
      (team) => isActiveRegistrationTeamStatus(team.status)
    );

  return (
    <DelegateDashboard
      initialData={data}
      venue={hasActiveTeam ? getChampionshipVenue() : undefined}
      announcements={hasActiveTeam ? announcements : []}
    />
  );
}
