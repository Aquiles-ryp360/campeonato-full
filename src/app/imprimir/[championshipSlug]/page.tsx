import { PrintableFixture } from "@/features/fixture/components/PrintableFixture";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fixture imprimible"
};

export default async function PrintableFixturePage({
  params
}: {
  params: Promise<{ championshipSlug: string }>;
}) {
  const { championshipSlug } = await params;
  // Solo equipos inscritos, arbitros y admin.
  await requireServerRole("member", `/imprimir/${championshipSlug}`);
  const data = await getPublicCompetitionData();
  const selected = getChampionshipPublicContext(data, championshipSlug);

  if (!selected.event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Campeonato no encontrado</h1>
        <p className="mt-2 text-sm font-semibold text-brand-muted">
          Verifica el enlace e intenta nuevamente.
        </p>
      </main>
    );
  }

  const activeTeams = selected.teams.filter((team) => isActiveRegistrationTeamStatus(team.status));
  const matches = buildVisibleFixtureMatches({
    events: [selected.event],
    teams: activeTeams,
    matches: selected.matches,
    venues: selected.venues
  });

  return (
    <PrintableFixture
      event={selected.event}
      teams={activeTeams}
      matches={matches}
      groups={selected.groups}
      groupTeams={selected.groupTeams}
    />
  );
}
