import type { Group, GroupTeam, Match, Team, TournamentEvent } from "@/lib/types";
import { PrintButton } from "@/features/fixture/components/PrintButton";
import { sportDisplayName } from "@/lib/domain/tournament-format";
import { formatShortDate, getMatchSideLabel } from "@/lib/utils";

// Tablas por grupo y planilla de partidos para llenar a mano despues del sorteo.
export function PrintableGroupSheets({
  event,
  groups,
  groupTeams,
  teams,
  matches
}: {
  event: TournamentEvent;
  groups: Group[];
  groupTeams: GroupTeam[];
  teams: Team[];
  matches: Match[];
}) {
  const isVoley = event.sport === "voley";
  const columns = isVoley
    ? ["PJ", "PG", "PP", "PF", "PC", "DIF", "Pts"]
    : ["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "Pts"];
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const knockout = matches
    .filter((match) => match.stage !== "group_stage")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.round - b.round);
  // La hoja impresa no muestra horas: solo el orden de juego del dia.
  const order = new Map(
    [...matches]
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.round - b.round)
      .map((match, index) => [match.id, index + 1])
  );

  return (
    <main className="fixture-print mx-auto max-w-4xl px-6 py-8 text-ink">
      <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-ink/70 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-electric">Tablas por grupo</p>
          <h1 className="mt-1 text-2xl font-black text-ink">{event.name}</h1>
          <p className="mt-1 text-sm font-semibold text-brand-muted">
            {sportDisplayName(event)}
            {event.eventDate ? ` · ${formatShortDate(event.eventDate)}` : ""} · Victoria {event.pointsWin} pts
            {isVoley ? "" : ` · Empate ${event.pointsDraw}`} · Derrota {event.pointsLoss}
          </p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </header>

      {sortedGroups.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-brand-muted">
          Todavia no se ha realizado el sorteo de grupos.
        </p>
      ) : null}

      <div className="space-y-8">
        {sortedGroups.map((group) => {
          const groupTeamIds = groupTeams.filter((item) => item.groupId === group.id).map((item) => item.teamId);
          const groupMatches = matches
            .filter((match) => match.groupId === group.id)
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

          return (
            <section key={group.id} className="break-inside-avoid">
              <h2 className="mb-2 text-lg font-black text-brand-navy">{group.name}</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ink/5 text-xs font-black uppercase">
                    <th className="w-8 border border-ink/60 px-1 py-1.5">#</th>
                    <th className="border border-ink/60 px-2 py-1.5 text-left">Equipo</th>
                    {columns.map((column) => (
                      <th key={column} className="w-11 border border-ink/60 px-1 py-1.5">
                        {column}
                      </th>
                    ))}
                    <th className="w-12 border border-ink/60 px-1 py-1.5">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTeamIds.map((teamId, index) => (
                    <tr key={teamId} className="h-9">
                      <td className="border border-ink/60 text-center font-bold">{index + 1}</td>
                      <td className="border border-ink/60 px-2 font-semibold">
                        {teams.find((team) => team.id === teamId)?.name ?? "Equipo"}
                      </td>
                      {columns.map((column) => (
                        <td key={column} className="border border-ink/60" />
                      ))}
                      <td className="border border-ink/60" />
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="mt-3 w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-black uppercase text-brand-muted">
                    <th className="w-10 py-1">N.°</th>
                    <th className="w-24 py-1">Cancha</th>
                    <th className="py-1 text-right">Local</th>
                    <th className="w-28 py-1 text-center">Resultado</th>
                    <th className="py-1">Visitante</th>
                    {isVoley ? null : <th className="w-20 py-1 text-center">Penales</th>}
                  </tr>
                </thead>
                <tbody>
                  {groupMatches.map((match) => (
                    <tr key={match.id} className="h-9 border-b border-ink/20">
                      <td className="font-bold">{order.get(match.id)}</td>
                      <td className="text-brand-muted">{match.court}</td>
                      <td className="pr-2 text-right font-semibold">{getMatchSideLabel(match, teams, "home")}</td>
                      <td className="text-center">
                        <ScoreBoxes />
                      </td>
                      <td className="pl-2 font-semibold">{getMatchSideLabel(match, teams, "away")}</td>
                      {isVoley ? null : (
                        <td className="text-center">
                          <ScoreBoxes small />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {knockout.length > 0 ? (
        <section className="mt-10 break-before-page">
          <h2 className="mb-3 text-lg font-black text-brand-navy">Fase final</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-black uppercase text-brand-muted">
                <th className="w-12 py-1">Cod.</th>
                <th className="w-10 py-1">N.°</th>
                <th className="py-1">Local (escribir equipo)</th>
                <th className="w-28 py-1 text-center">Resultado</th>
                <th className="py-1">Visitante (escribir equipo)</th>
              </tr>
            </thead>
            <tbody>
              {knockout.map((match) => (
                <tr key={match.id} className="h-12 border-b border-ink/20 align-bottom">
                  <td className="pb-1 font-black">{match.label}</td>
                  <td className="pb-1 font-bold">{order.get(match.id)}</td>
                  <td className="pb-1 pr-2">
                    <span className="text-[11px] font-bold text-brand-muted">{match.homePlaceholder}</span>
                    <span className="mt-1 block border-b border-ink/50" />
                  </td>
                  <td className="pb-1 text-center">
                    <ScoreBoxes />
                  </td>
                  <td className="pb-1 pl-2">
                    <span className="text-[11px] font-bold text-brand-muted">{match.awayPlaceholder}</span>
                    <span className="mt-1 block border-b border-ink/50" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}

function ScoreBoxes({ small = false }: { small?: boolean }) {
  const box = small ? "h-6 w-6" : "h-7 w-8";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block rounded-sm border border-ink/60 ${box}`} />
      <span className="font-black">-</span>
      <span className={`inline-block rounded-sm border border-ink/60 ${box}`} />
    </span>
  );
}
