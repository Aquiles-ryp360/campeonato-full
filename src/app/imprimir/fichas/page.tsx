import { PrintableRosterSheet } from "@/features/admin/components/PrintableRosterSheet";
import { PrintButton } from "@/features/fixture/components/PrintButton";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fichas de jugadores"
};

// Una nomina por equipo (una hoja cada una), para firmar y completar a mano.
export default async function PrintableRostersPage({
  searchParams
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const { evento } = await searchParams;
  await requireServerRole("admin", "/imprimir/fichas");
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  const event = data.events.find((item) => item.id === evento);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Campeonato no encontrado</h1>
      </main>
    );
  }

  const teams = data.teams
    .filter((team) => team.eventId === event.id && isActiveRegistrationTeamStatus(team.status))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-6 print:hidden">
        <p className="text-sm font-bold text-brand-muted">
          {teams.length} fichas · {event.name}
        </p>
        <PrintButton />
      </div>
      {teams.length === 0 ? (
        <p className="py-16 text-center text-sm font-semibold text-brand-muted">Todavia no hay equipos inscritos.</p>
      ) : (
        teams.map((team) => (
          <PrintableRosterSheet
            key={team.id}
            event={event}
            team={team}
            players={data.players.filter((player) => player.teamId === team.id)}
            showPrintButton={false}
            className="break-after-page"
          />
        ))
      )}
    </div>
  );
}
