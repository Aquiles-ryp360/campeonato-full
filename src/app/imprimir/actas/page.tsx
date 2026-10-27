import { PrintableMatchSheets } from "@/features/admin/components/PrintableMatchSheets";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Actas de partido"
};

export default async function PrintableMatchSheetsPage({
  searchParams
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const { evento } = await searchParams;
  // Equipos inscritos, arbitros y admin (igual que el fixture imprimible).
  await requireServerRole("member", "/imprimir/actas");
  const data = await getPublicCompetitionData();
  const event = data.events.find((item) => item.id === evento);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Campeonato no encontrado</h1>
      </main>
    );
  }

  return (
    <PrintableMatchSheets
      event={event}
      groups={data.groups.filter((group) => group.eventId === event.id)}
      teams={data.teams.filter((team) => team.eventId === event.id)}
      matches={data.matches.filter((match) => match.eventId === event.id)}
    />
  );
}
