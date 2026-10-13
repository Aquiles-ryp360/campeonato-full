import type { Group, Match, Team, TournamentEvent } from "@/lib/types";
import { formatLabel, formatShortDate, getMatchSideLabel, sportLabel } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

const stageOrder: Match["stage"][] = [
  "group_stage",
  "preliminary",
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "third_place",
  "final"
];

const stageTitles: Record<Match["stage"], string> = {
  group_stage: "Fase de grupos",
  preliminary: "Ronda preliminar",
  round_of_16: "Octavos de final",
  quarter_finals: "Cuartos de final",
  semi_finals: "Semifinales",
  third_place: "Tercer lugar",
  final: "Final"
};

type FixtureSection = { key: string; title: string; matches: Match[] };

function sortMatches(matches: Match[]) {
  return [...matches].sort(
    (a, b) =>
      a.round - b.round ||
      a.scheduledAt.localeCompare(b.scheduledAt) ||
      (a.label ?? "").localeCompare(b.label ?? "")
  );
}

function buildSections(matches: Match[], groups: Group[]): FixtureSection[] {
  const sections: FixtureSection[] = [];
  const usedMatchIds = new Set<string>();

  for (const group of groups) {
    const groupMatches = matches.filter((match) => match.groupId === group.id);
    groupMatches.forEach((match) => usedMatchIds.add(match.id));
    if (groupMatches.length > 0) {
      sections.push({ key: group.id, title: group.name, matches: sortMatches(groupMatches) });
    }
  }

  const remaining = matches.filter((match) => !usedMatchIds.has(match.id));
  for (const stage of stageOrder) {
    const stageMatches = remaining.filter((match) => match.stage === stage);
    if (stageMatches.length === 0) continue;
    sections.push({ key: stage, title: stageTitles[stage], matches: sortMatches(stageMatches) });
  }

  return sections;
}

export function PrintableFixture({
  event,
  teams,
  matches,
  groups
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
  groups: Group[];
}) {
  const sections = buildSections(matches, groups);

  return (
    <main className="fixture-print mx-auto max-w-4xl px-6 py-8 text-ink">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-ink/20 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-electric">
            Fixture
          </p>
          <h1 className="text-2xl font-black text-ink">{event.name}</h1>
          <p className="mt-1 text-sm font-semibold text-brand-muted">
            {event.category} · {formatLabel(event.format)} · {sportLabel(event.sport)}
            {event.eventDate ? ` · ${formatShortDate(event.eventDate)}` : ""}
          </p>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </header>

      {sections.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-brand-muted">
          Todavia no hay partidos programados.
        </p>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-brand-navy">
                {section.title}
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/25 text-left text-xs font-black uppercase text-brand-muted">
                    <th className="w-10 py-1.5 pr-2">#</th>
                    <th className="py-1.5 pr-2">Partido</th>
                    <th className="w-32 py-1.5 text-right">Cancha</th>
                  </tr>
                </thead>
                <tbody>
                  {section.matches.map((match, index) => (
                    <tr key={match.id} className="border-b border-ink/10 align-top">
                      <td className="py-1.5 pr-2 font-bold text-brand-muted">{index + 1}</td>
                      <td className="py-1.5 pr-2 font-semibold text-ink">
                        <span>{getMatchSideLabel(match, teams, "home")}</span>
                        <span className="mx-1.5 text-brand-electric">vs</span>
                        <span>{getMatchSideLabel(match, teams, "away")}</span>
                      </td>
                      <td className="py-1.5 text-right text-brand-muted">{match.court}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
