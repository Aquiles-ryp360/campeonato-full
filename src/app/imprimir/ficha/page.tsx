import { PrintableRosterSheet } from "@/features/admin/components/PrintableRosterSheet";
import { getPublicCompetitionData } from "@/lib/supabase-data";
import { requireServerRole } from "@/lib/server-page-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ficha de inscripcion"
};

export default async function PrintableRosterPage({
  searchParams
}: {
  searchParams: Promise<{ evento?: string; equipo?: string }>;
}) {
  const { evento, equipo } = await searchParams;
  // La ficha llena muestra DNI de jugadores: solo admin.
  await requireServerRole("admin", "/imprimir/ficha");
  const data = await getPublicCompetitionData({ includePrivatePlayerFields: true });
  const team = equipo ? data.teams.find((item) => item.id === equipo) : undefined;
  const event = data.events.find((item) => item.id === (team?.eventId ?? evento));

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Campeonato no encontrado</h1>
        <p className="mt-2 text-sm font-semibold text-brand-muted">Vuelve al panel de equipos e intenta nuevamente.</p>
      </main>
    );
  }

  const players = team ? data.players.filter((player) => player.teamId === team.id) : [];

  return <PrintableRosterSheet event={event} team={team} players={players} />;
}
