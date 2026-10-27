import type { Player, Team, TournamentEvent } from "@/lib/types";
import { PrintButton } from "@/features/fixture/components/PrintButton";
import { sportDisplayName } from "@/lib/domain/tournament-format";
import { formatShortDate } from "@/lib/utils";

// Nomina de jugadores para llenar a mano (en blanco o con los datos ya registrados).
export function PrintableRosterSheet({
  event,
  team,
  players,
  showPrintButton = true,
  className = ""
}: {
  event: TournamentEvent;
  team?: Team;
  players: Player[];
  showPrintButton?: boolean;
  className?: string;
}) {
  const rows = Math.max(event.maxPlayers, players.length);

  return (
    <main className={`fixture-print mx-auto max-w-4xl px-6 py-8 text-ink ${className}`}>
      <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-ink/70 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-electric">
            Escuela Profesional de Ingenieria Mecanica Electrica
          </p>
          <h1 className="mt-1 text-2xl font-black text-ink">Nomina de jugadores</h1>
          <p className="mt-1 text-sm font-semibold text-brand-muted">
            {event.name} · {sportDisplayName(event)}
            {event.eventDate ? ` · ${formatShortDate(event.eventDate)}` : ""}
          </p>
        </div>
        {showPrintButton ? (
          <div className="print:hidden">
            <PrintButton />
          </div>
        ) : null}
      </header>

      <section className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Line label="Disciplina" value={sportDisplayName(event)} />
        <Line label="Nombre del equipo" value={team?.name} />
        <Line label="Semestre" value={team?.academicCareer} />
        <Line label="Delegado" value={team?.delegateName} />
        <Line label="Sub delegado" />
        <Line label="Celular del delegado" value={team?.delegatePhone} />
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink/5 text-left text-xs font-black uppercase">
            <th className="w-10 border border-ink/60 px-2 py-2 text-center">N.°</th>
            <th className="border border-ink/60 px-2 py-2">Apellidos y nombres</th>
            <th className="w-28 border border-ink/60 px-2 py-2">Codigo</th>
            <th className="w-28 border border-ink/60 px-2 py-2">DNI</th>
            <th className="w-20 border border-ink/60 px-2 py-2">Semestre</th>
            <th className="w-32 border border-ink/60 px-2 py-2">Firma</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => {
            const player = players[index];
            return (
              <tr key={index} className="h-11">
                <td className="border border-ink/60 px-2 text-center font-bold">{index + 1}</td>
                <td className="border border-ink/60 px-2">
                  {player ? `${player.lastName}, ${player.firstName}` : ""}
                </td>
                <td className="border border-ink/60 px-2">{player?.studentCode ?? ""}</td>
                <td className="border border-ink/60 px-2">{player?.dni ?? ""}</td>
                <td className="border border-ink/60 px-2">{player?.semester ?? ""}</td>
                <td className="border border-ink/60 px-2" />
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="mt-6 space-y-1 text-xs font-semibold text-brand-muted">
        <p>Adjuntar ficha de matricula vigente (fisica o PDF) de cada jugador. Maximo {event.maxPlayers} jugadores.</p>
        <p>Los jugadores solo pueden jugar por el semestre en el que estan matriculados y no pueden inscribirse en mas de un equipo.</p>
      </section>

      <section className="mt-14 grid grid-cols-2 gap-10 text-center text-sm font-bold">
        <div>
          <span className="block border-t border-ink/70 pt-2">Firma del delegado</span>
        </div>
        <div>
          <span className="block border-t border-ink/70 pt-2">Comision organizadora</span>
        </div>
      </section>
    </main>
  );
}

function Line({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 min-h-7 border-b border-ink/50 pb-1 font-semibold">{value ?? ""}</p>
    </div>
  );
}
