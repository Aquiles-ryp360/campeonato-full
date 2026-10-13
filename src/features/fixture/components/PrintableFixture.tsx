import type { Group, GroupTeam, Match, Team, TournamentEvent } from "@/lib/types";
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

type FixtureSection = { key: string; title: string; matches: Match[]; groupId?: string };

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
    sections.push({
      key: group.id,
      title: group.name,
      groupId: group.id,
      matches: sortMatches(groupMatches)
    });
  }

  const remaining = matches.filter((match) => !usedMatchIds.has(match.id));
  for (const stage of stageOrder) {
    const stageMatches = remaining.filter((match) => match.stage === stage);
    if (stageMatches.length === 0) continue;
    sections.push({ key: stage, title: stageTitles[stage], matches: sortMatches(stageMatches) });
  }

  return sections;
}

function buildGroupRosters(groups: Group[], groupTeams: GroupTeam[], teams: Team[]) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return groups.map((group) => ({
    group,
    members: groupTeams
      .filter((row) => row.groupId === group.id)
      .map((row) => teamsById.get(row.teamId))
      .filter((team): team is Team => Boolean(team))
  }));
}

function buildTeamCodes(groups: Group[], groupTeams: GroupTeam[]): Map<string, string> {
  const codes = new Map<string, string>();
  let counter = 0;
  for (const group of groups) {
    for (const row of groupTeams.filter((item) => item.groupId === group.id)) {
      if (!codes.has(row.teamId)) {
        counter += 1;
        codes.set(row.teamId, `E${String(counter).padStart(2, "0")}`);
      }
    }
  }
  return codes;
}

export function PrintableFixture({
  event,
  teams,
  matches,
  groups,
  groupTeams = []
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
  groups: Group[];
  groupTeams?: GroupTeam[];
}) {
  const sections = buildSections(matches, groups);
  const rosters = buildGroupRosters(groups, groupTeams, teams);
  const teamCodes = buildTeamCodes(groups, groupTeams);
  const hasGroups = groups.length > 0;

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

      <div className="mb-5 grid grid-cols-3 gap-3 text-xs font-bold uppercase tracking-wide text-brand-muted">
        <FillField label="Fecha" />
        <FillField label="Responsable" />
        <FillField label="Cancha / Zona" />
      </div>

      {hasGroups ? (
        <p className="mb-5 rounded-md border border-dashed border-ink/25 bg-brand-wash/50 px-3 py-2 text-xs font-semibold text-brand-muted">
          Codigo de cada equipo (E01, E02, ...). Los 2 primeros de cada grupo clasifican a la
          llave final: el 1ro y el 2do ya tienen su lugar asignado en la ronda preliminar y los
          cuartos de final.
        </p>
      ) : null}

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

              {section.groupId ? (
                <GroupRosterTable
                  members={rosters.find((row) => row.group.id === section.groupId)?.members ?? []}
                  teamCodes={teamCodes}
                />
              ) : null}

              {section.matches.length === 0 ? (
                <p className="text-xs font-semibold text-brand-muted/70">
                  Aun no hay partidos cargados para esta fase.
                </p>
              ) : (
                <MatchTable
                  matches={section.matches}
                  teams={teams}
                  teamCodes={teamCodes}
                  showRosterGap={Boolean(section.groupId)}
                />
              )}
            </section>
          ))}
        </div>
      )}

      <footer className="mt-8 flex items-end justify-between gap-6 text-xs font-bold uppercase tracking-wide text-brand-muted">
        <span>Firma del responsable</span>
        <span className="flex-1 border-t border-ink/30" />
      </footer>
    </main>
  );
}

function GroupRosterTable({
  members,
  teamCodes
}: {
  members: Team[];
  teamCodes: Map<string, string>;
}) {
  if (members.length === 0) return null;

  return (
    <table className="mb-3 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-ink/25 text-left text-xs font-black uppercase text-brand-muted">
          <th className="w-8 py-1.5 pr-2">Pos</th>
          <th className="w-12 py-1.5 pr-2">Cod.</th>
          <th className="py-1.5 pr-2">Equipo</th>
          <th className="w-12 py-1.5 pr-2 text-center">PJ</th>
          <th className="w-12 py-1.5 pr-2 text-center">DG</th>
          <th className="w-12 py-1.5 pr-2 text-center">Pts</th>
          <th className="w-24 py-1.5 pr-2">Clasifica</th>
        </tr>
      </thead>
      <tbody>
        {members.map((team, index) => {
          const position = index + 1;
          const qualifies = position <= 2;
          return (
            <tr
              key={team.id}
              className={`border-b border-ink/10 align-middle ${
                qualifies ? "bg-brand-electric/5" : ""
              }`}
            >
              <td className="py-2 pr-2 font-bold text-brand-muted">{position}</td>
              <td className="py-2 pr-2 font-mono text-xs font-bold text-brand-electric">
                {teamCodes.get(team.id) ?? "-"}
              </td>
              <td className="py-2 pr-2 font-semibold text-ink">{team.name}</td>
              <td className="py-2 pr-2 text-center">
                <BlankBox />
              </td>
              <td className="py-2 pr-2 text-center">
                <BlankBox />
              </td>
              <td className="py-2 pr-2 text-center">
                <BlankBox />
              </td>
              <td className="py-2 pr-2 text-xs font-bold uppercase text-brand-electric">
                {qualifies ? `${position === 1 ? "1ro" : "2do"} llave` : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MatchTable({
  matches,
  teams,
  teamCodes,
  showRosterGap
}: {
  matches: Match[];
  teams: Team[];
  teamCodes: Map<string, string>;
  showRosterGap: boolean;
}) {
  return (
    <table className={`w-full border-collapse text-sm ${showRosterGap ? "border-t border-ink/20" : ""}`}>
      <thead>
        <tr className="border-b border-ink/25 text-left text-xs font-black uppercase text-brand-muted">
          <th className="w-8 py-1.5 pr-2">#</th>
          <th className="py-1.5 pr-2">Partido</th>
          <th className="w-20 py-1.5 pr-2">Cancha</th>
          <th className="w-28 py-1.5 pr-2 text-center">Resultado</th>
          <th className="w-40 py-1.5 pr-2">Observacion</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((match, index) => (
          <tr key={match.id} className="border-b border-ink/10 align-middle">
            <td className="py-2 pr-2 font-bold text-brand-muted">{index + 1}</td>
            <td className="py-2 pr-2 font-semibold text-ink">
              <SideLabel match={match} teams={teams} teamCodes={teamCodes} side="home" />
              <span className="mx-1.5 text-brand-electric">vs</span>
              <SideLabel match={match} teams={teams} teamCodes={teamCodes} side="away" />
            </td>
            <td className="py-2 pr-2 text-brand-muted">{match.court}</td>
            <td className="py-2 pr-2">
              <div className="flex items-center justify-center gap-1.5">
                <BlankBox />
                <span className="text-brand-towerMid">-</span>
                <BlankBox />
              </div>
            </td>
            <td className="py-2 pr-2">
              <span className="block h-6 border-b border-dashed border-ink/30" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SideLabel({
  match,
  teams,
  teamCodes,
  side
}: {
  match: Match;
  teams: Team[];
  teamCodes: Map<string, string>;
  side: "home" | "away";
}) {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const code = teamId ? teamCodes.get(teamId) : undefined;

  return (
    <span>
      {code ? (
        <span className="mr-1 font-mono text-xs font-bold text-brand-electric">{code}</span>
      ) : null}
      {getMatchSideLabel(match, teams, side)}
    </span>
  );
}

function FillField({ label }: { label: string }) {
  return (
    <div>
      <p>{label}</p>
      <span className="mt-1 block h-6 border-b border-ink/30" />
    </div>
  );
}

function BlankBox() {
  return <span className="inline-block h-6 w-9 rounded-sm border border-ink/40" />;
}
