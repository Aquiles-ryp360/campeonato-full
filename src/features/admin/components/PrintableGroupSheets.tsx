import type { Group, GroupTeam, Match, Team, TournamentEvent } from "@/lib/types";
import { AutoPrint, PrintButton } from "@/features/fixture/components/PrintButton";
import { sportDisplayName } from "@/lib/domain/tournament-format";
import { formatShortDate, getMatchSideLabel } from "@/lib/utils";

// Tablas por grupo y planilla de partidos para llenar a mano despues del sorteo.
export function PrintableGroupSheets({
  event,
  groups,
  groupTeams,
  teams,
  matches,
  autoPrint = false
}: {
  autoPrint?: boolean;
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
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const groupStageMatches = matches
    .filter((match) => match.stage === "group_stage")
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

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
          <PrintButton label="Imprimir / Guardar PDF" />
          {autoPrint && groups.length > 0 ? <AutoPrint /> : null}
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
              <h2 className="text-lg font-black text-brand-navy">{group.name}</h2>
              <p className="mb-2 text-xs font-semibold text-brand-muted">
                Equipos: {groupTeamIds.map((teamId) => teams.find((team) => team.id === teamId)?.name ?? "Equipo").join(" · ")}
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ink/5 text-xs font-black uppercase">
                    <th className="w-12 border border-ink/60 px-1 py-1.5">Pos.</th>
                    <th className="border border-ink/60 px-2 py-1.5 text-left">Equipo</th>
                    {columns.map((column) => (
                      <th key={column} className="w-11 border border-ink/60 px-1 py-1.5">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Se llena a mano al cerrar el grupo, ya ordenado por puntos. */}
                  {groupTeamIds.map((teamId, index) => (
                    <tr key={teamId} className="h-9">
                      <td className="border border-ink/60 text-center font-bold">{index + 1}°</td>
                      <td className="border border-ink/60 px-2" />
                      {columns.map((column) => (
                        <td key={column} className="border border-ink/60" />
                      ))}
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

      {groupStageMatches.length > 0 ? (
        <section className="mt-10 break-before-page">
          <h2 className="mb-1 text-lg font-black text-brand-navy">Orden general de partidos</h2>
          <p className="mb-3 text-xs font-semibold text-brand-muted">
            Todos los partidos de la fase de grupos en el orden en que se juegan.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-ink/5 text-xs font-black uppercase">
                <th className="w-10 border border-ink/60 px-1 py-1.5">N.°</th>
                <th className="w-20 border border-ink/60 px-1 py-1.5">Grupo</th>
                <th className="w-20 border border-ink/60 px-1 py-1.5">Cancha</th>
                <th className="border border-ink/60 px-2 py-1.5 text-right">Local</th>
                <th className="w-28 border border-ink/60 px-1 py-1.5">Resultado</th>
                <th className="border border-ink/60 px-2 py-1.5 text-left">Visitante</th>
                {isVoley ? null : <th className="w-20 border border-ink/60 px-1 py-1.5">Penales</th>}
              </tr>
            </thead>
            <tbody>
              {groupStageMatches.map((match) => (
                <tr key={match.id} className="h-9 break-inside-avoid">
                  <td className="border border-ink/60 text-center font-bold">{order.get(match.id)}</td>
                  <td className="border border-ink/60 text-center font-semibold">
                    {groupNames.get(match.groupId ?? "")?.replace(/^Grupo\s+/i, "") ?? "-"}
                  </td>
                  <td className="border border-ink/60 text-center text-brand-muted">{match.court}</td>
                  <td className="border border-ink/60 px-2 text-right font-semibold">
                    {getMatchSideLabel(match, teams, "home")}
                  </td>
                  <td className="border border-ink/60 text-center">
                    <ScoreBoxes />
                  </td>
                  <td className="border border-ink/60 px-2 font-semibold">{getMatchSideLabel(match, teams, "away")}</td>
                  {isVoley ? null : (
                    <td className="border border-ink/60 text-center">
                      <ScoreBoxes small />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {knockout.length > 0 ? <PrintableBracket matches={knockout} isVoley={isVoley} /> : null}

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

const bracketColumns: Array<{ stage: Match["stage"]; title: string }> = [
  { stage: "preliminary", title: "Preliminar" },
  { stage: "quarter_finals", title: "Cuartos" },
  { stage: "semi_finals", title: "Semifinal" },
  { stage: "final", title: "Final" }
];

// Llave dibujada para llenar a mano: una columna por ronda, cada partido con su cruce y casillas.
function PrintableBracket({ matches, isVoley }: { matches: Match[]; isVoley: boolean }) {
  const byStage = (stage: Match["stage"]) =>
    matches.filter((match) => match.stage === stage).sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  const columns = bracketColumns.filter((column) => byStage(column.stage).length > 0);
  const thirdPlace = byStage("third_place")[0];

  return (
    <section className="mt-10 break-before-page">
      <h2 className="mb-1 text-lg font-black text-brand-navy">Llave de la fase final</h2>
      <p className="mb-4 text-xs font-semibold text-brand-muted">
        Escribe en cada linea el equipo que clasifico y el resultado{isVoley ? " (sets)" : ""}. El ganador avanza a la columna de la derecha.
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((column) => (
          <div key={column.stage} className="flex flex-col">
            <p className="mb-2 text-center text-xs font-black uppercase text-brand-electric">{column.title}</p>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {byStage(column.stage).map((match) => (
                <BracketBox key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {thirdPlace ? (
        <div className="mt-6 max-w-xs">
          <p className="mb-2 text-xs font-black uppercase text-brand-electric">Tercer lugar</p>
          <BracketBox match={thirdPlace} />
        </div>
      ) : null}
      <div className="mt-6 grid max-w-md grid-cols-[auto_1fr] items-end gap-x-3 gap-y-3 text-sm font-black">
        <span>Campeon:</span>
        <span className="border-b border-ink/60" />
        <span>Subcampeon:</span>
        <span className="border-b border-ink/60" />
        {thirdPlace ? (
          <>
            <span>Tercer lugar:</span>
            <span className="border-b border-ink/60" />
          </>
        ) : null}
      </div>
    </section>
  );
}

function BracketBox({ match }: { match: Match }) {
  return (
    <div className="break-inside-avoid rounded border border-ink/60 text-xs">
      <p className="border-b border-ink/40 bg-ink/5 px-1.5 py-0.5 font-black">{match.label}</p>
      {[match.homePlaceholder, match.awayPlaceholder].map((placeholder, index) => (
        <div key={index} className={`flex items-end gap-1.5 px-1.5 py-1 ${index === 0 ? "border-b border-ink/30" : ""}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold text-brand-muted">{placeholder ?? "Por definir"}</p>
            <span className="mt-2 block border-b border-ink/50" />
          </div>
          <span className="inline-block h-6 w-7 shrink-0 rounded-sm border border-ink/60" />
        </div>
      ))}
    </div>
  );
}
