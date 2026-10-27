import { PrintableGroupSheets } from "@/features/admin/components/PrintableGroupSheets";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tablas por grupo"
};

export default async function PrintableGroupsPage({
  searchParams
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const { evento } = await searchParams;
  // Solo equipos inscritos, arbitros y admin (igual que el fixture imprimible).
  await requireServerRole("member", "/imprimir/grupos");
  const data = await getPublicCompetitionData();
  const event = data.events.find((item) => item.id === evento);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Campeonato no encontrado</h1>
      </main>
    );
  }

  const groups = data.groups.filter((group) => group.eventId === event.id);
  const groupIds = new Set(groups.map((group) => group.id));

  return (
    <PrintableGroupSheets
      event={event}
      groups={groups}
      groupTeams={data.groupTeams.filter((item) => groupIds.has(item.groupId))}
      teams={data.teams.filter((team) => team.eventId === event.id)}
      matches={data.matches.filter((match) => match.eventId === event.id)}
    />
  );
}
