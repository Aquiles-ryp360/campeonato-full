import type { Group, Match, Team, TournamentEvent } from "@/lib/types";
import { PrintButton } from "@/features/fixture/components/PrintButton";
import { sportDisplayName } from "@/lib/domain/tournament-format";
import { formatShortDate } from "@/lib/utils";

const stageTitles: Record<Match["stage"], string> = {
  group_stage: "Fase de grupos",
  preliminary: "Ronda preliminar",
  round_of_16: "Octavos de final",
  quarter_finals: "Cuartos de final",
  semi_finals: "Semifinal",
  third_place: "Tercer lugar",
  final: "Final"
};

// Actas de partido para validar resultados en papel: equipo vs equipo, marcador
// y firmas de capitanes y arbitro. Sin hora, solo el orden de juego.
export function PrintableMatchSheets({
  event,
  groups,
  teams,
  matches
}: {
  event: TournamentEvent;
  groups: Group[];
  teams: Team[];
  matches: Match[];
}) {
  const ordered = [...matches].sort(
    (a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.round - b.round || (a.label ?? "").localeCompare(b.label ?? "")
  );
  const isVoley = event.sport === "voley";

  return (
    <main className="fixture-print mx-auto max-w-4xl px-6 py-6 text-ink">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm font-bold text-brand-muted">
          {ordered.length} actas · {event.name} · 2 por hoja
        </p>
        <PrintButton />
      </div>

      {ordered.length === 0 ? (
        <p className="py-16 text-center text-sm font-semibold text-brand-muted">Todavia no hay partidos programados.</p>
      ) : null}

      {ordered.map((match, index) => {
        const group = groups.find((item) => item.id === match.groupId);
        const sets = isVoley ? (match.stage === "final" ? 3 : 1) : 0;
        const scoreRows = isVoley
          ? Array.from({ length: sets }, (_, k) => `Set ${k + 1} (a ${k === 2 ? 10 : 20})`)
          : ["Goles", "Penales (si hay empate)"];

        return (
          <section
            key={match.id}
            className={`break-inside-avoid rounded-lg border border-ink/40 p-4 ${index % 2 === 1 ? "mt-6 print:break-after-page" : "mb-6"}`}
            style={{ minHeight: "125mm" }}
          >
            <header className="flex items-start justify-between border-b-2 border-ink/70 pb-2">
              <div>
                <p className="text-lg font-black uppercase text-brand-navy">Acta de partido · {sportDisplayName(event)}</p>
                <p className="text-xs font-semibold text-brand-muted">
                  {event.name}
                  {event.eventDate ? ` · ${formatShortDate(event.eventDate)}` : ""}
                </p>
              </div>
              <p className="rounded-md border-2 border-ink px-3 py-1 text-xl font-black">N.° {index + 1}</p>
            </header>

            <p className="mt-2 text-sm font-bold">
              {stageTitles[match.stage]}
              {group ? ` · ${group.name} · Fecha ${match.round}` : ""}
              {match.label ? ` · Codigo ${match.label}` : ""} · {match.court}
            </p>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
              <TeamLine label="Equipo local" match={match} teams={teams} side="home" />
              <span className="pb-1 text-xl font-black text-brand-navy">VS</span>
              <TeamLine label="Equipo visitante" match={match} teams={teams} side="away" />
            </div>

            <div className="mt-4 space-y-2">
              {scoreRows.map((label) => (
                <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <span className="mx-auto block h-8 w-10 rounded-sm border-2 border-ink/70" />
                  <span className="w-44 text-center text-sm font-bold">{label}</span>
                  <span className="mx-auto block h-8 w-10 rounded-sm border-2 border-ink/70" />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-end gap-6 text-sm font-bold">
              <span className="flex flex-1 items-end gap-2">
                Ganador: <span className="block flex-1 border-b border-ink/70" />
              </span>
              <span className="flex items-center gap-2">
                W.O.: <span className="inline-block h-4 w-4 border border-ink/70" /> Si
                <span className="inline-block h-4 w-4 border border-ink/70" /> No
              </span>
            </div>
            <p className="mt-3 text-sm font-bold">Tarjetas / observaciones:</p>
            <span className="mt-4 block border-b border-ink/40" />
            <span className="mt-5 block border-b border-ink/40" />

            <div className="mt-12 grid grid-cols-3 gap-6 text-center text-xs font-bold">
              {["Capitan equipo local", "Capitan equipo visitante", "Arbitro"].map((label) => (
                <div key={label}>
                  <span className="block border-t border-ink/70 pt-1">{label}</span>
                  <span className="mt-1 block font-normal text-brand-muted">Nombre y DNI: ______________</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function TeamLine({
  label,
  match,
  teams,
  side
}: {
  label: string;
  match: Match;
  teams: Team[];
  side: "home" | "away";
}) {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;
  const name = teamId ? teams.find((team) => team.id === teamId)?.name : undefined;

  return (
    <div>
      <p className="text-[11px] font-black uppercase text-brand-muted">{label}</p>
      {name ? null : <p className="text-xs font-bold text-brand-electric">{placeholder ?? "Por definir"}</p>}
      <p className="min-h-7 border-b-2 border-ink/70 pb-1 text-base font-black">{name ?? ""}</p>
    </div>
  );
}
