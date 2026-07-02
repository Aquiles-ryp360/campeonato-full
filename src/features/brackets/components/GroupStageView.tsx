"use client";

import type { Group, GroupStanding, GroupTeam, Match, Team, TournamentEvent } from "@/lib/types";
import {
  buildGroupQualificationPlan,
  type BestThirdCandidate,
  type GroupStandingDisplayRow
} from "@/lib/domain/standings";
import { Badge, Card } from "@/components/ui";
import { getTeamName } from "@/lib/utils";

export function GroupStageView({
  event,
  groups,
  groupTeams,
  groupStandings,
  matches,
  teams,
  onOpenTeam
}: {
  event: TournamentEvent;
  groups: Group[];
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
  matches: Match[];
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  if (groups.length === 0) {
    return (
      <Card className="p-6 text-sm font-semibold text-brand-muted">
        Los grupos apareceran cuando el administrador cierre la inscripcion y distribuya equipos.
      </Card>
    );
  }

  const qualification = buildGroupQualificationPlan({
    event,
    groups,
    groupTeams,
    groupStandings,
    matches,
    teams
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-brand-towerMid/20 bg-brand-wash p-4">
              <h3 className="font-bold text-ink">{group.name}</h3>
              <Badge tone="green">
                {qualification.directPerGroup} directos
              </Badge>
            </div>
            <GroupTable
              rows={qualification.groupRows.get(group.id) ?? []}
              teams={teams}
              onOpenTeam={onOpenTeam}
            />
          </Card>
        ))}
      </div>
      {qualification.bestThirdCandidates.length > 0 ? (
        <BestThirdsTable
          candidates={qualification.bestThirdCandidates}
          selected={new Set(qualification.selectedBestThirds.map((row) => row.teamId))}
          bestThirdCount={qualification.bestThirdCount}
          knockoutSize={qualification.knockoutSize}
          teams={teams}
          onOpenTeam={onOpenTeam}
        />
      ) : null}
    </div>
  );
}

function GroupTable({
  rows,
  teams,
  onOpenTeam
}: {
  rows: GroupStandingDisplayRow[];
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-brand-navy text-left text-xs uppercase text-white">
          <tr>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-2 py-3">PJ</th>
            <th className="px-2 py-3">DG</th>
            <th className="px-2 py-3">GF</th>
            <th className="px-2 py-3">Pts</th>
            <th className="px-4 py-3">Clasifica</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-towerMid/20">
          {rows.map((row) => {
            const team = teams.find((item) => item.id === row.teamId);
            return (
              <tr key={row.id} className={rowClassName(row)}>
                <td className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => team && onOpenTeam?.(team)}
                    className="rounded text-left hover:text-brand-electric"
                  >
                    {getTeamName(teams, row.teamId)}
                  </button>
                </td>
                <td className="px-2 py-3">{row.played}</td>
                <td className="px-2 py-3">{row.goalDifference}</td>
                <td className="px-2 py-3">{row.goalsFor}</td>
                <td className="px-2 py-3 font-bold">{row.points}</td>
                <td className="px-4 py-3">
                  <QualificationBadge row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BestThirdsTable({
  candidates,
  selected,
  bestThirdCount,
  knockoutSize,
  teams,
  onOpenTeam
}: {
  candidates: BestThirdCandidate[];
  selected: Set<string>;
  bestThirdCount: number;
  knockoutSize: number;
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-brand-yellow/50 bg-brand-yellow/20 p-4">
        <div>
          <h3 className="font-bold text-ink">Mejores terceros</h3>
          <p className="text-sm font-semibold text-brand-muted">
            Completan la llave de {knockoutSize} equipos segun puntos, diferencia y goles a favor.
          </p>
        </div>
        <Badge tone="amber">{bestThirdCount} cupos</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-navy text-left text-xs uppercase text-white">
            <tr>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-2 py-3">PJ</th>
              <th className="px-2 py-3">DG</th>
              <th className="px-2 py-3">GF</th>
              <th className="px-4 py-3">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-towerMid/20">
            {candidates.map((row) => {
              const team = teams.find((item) => item.id === row.teamId);
              return (
                <tr key={`${row.groupId}-${row.teamId}`} className={selected.has(row.teamId) ? "bg-brand-yellow/15" : "bg-white"}>
                  <td className="px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => team && onOpenTeam?.(team)}
                      className="rounded text-left hover:text-brand-electric"
                    >
                      {getTeamName(teams, row.teamId)}
                    </button>
                  </td>
                  <td className="px-4 py-3">{row.groupName}</td>
                  <td className="px-2 py-3">{row.played}</td>
                  <td className="px-2 py-3">{row.goalDifference}</td>
                  <td className="px-2 py-3">{row.goalsFor}</td>
                  <td className="px-4 py-3 font-bold">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function QualificationBadge({ row }: { row: GroupStandingDisplayRow }) {
  if (row.qualificationType === "direct") {
    return <Badge tone="green">Directo</Badge>;
  }

  if (row.qualificationType === "best_third") {
    return <Badge tone="amber">Mejor 3ro</Badge>;
  }

  return <span className="text-xs font-semibold text-brand-muted">Pendiente</span>;
}

function rowClassName(row: GroupStandingDisplayRow) {
  if (row.qualificationType === "direct") return "bg-brand-electric/5";
  if (row.qualificationType === "best_third") return "bg-brand-yellow/15";
  return "bg-white";
}
