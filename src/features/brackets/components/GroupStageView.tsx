"use client";

import type { Group, GroupStanding, GroupTeam, Team } from "@/lib/types";
import { Badge, Card } from "@/components/ui";
import { getTeamName } from "@/lib/utils";

export function GroupStageView({
  groups,
  groupTeams,
  groupStandings,
  teams,
  onOpenTeam
}: {
  groups: Group[];
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
  teams: Team[];
  onOpenTeam?: (team: Team) => void;
}) {
  if (groups.length === 0) {
    return (
      <Card className="p-6 text-sm text-ink/55">
        Los grupos apareceran cuando el administrador cierre la inscripcion y distribuya equipos.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => {
        const rows = groupStandings
          .filter((row) => row.groupId === group.id)
          .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
        const assignedTeamIds = groupTeams
          .filter((row) => row.groupId === group.id)
          .map((row) => row.teamId);

        return (
          <Card key={group.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-mist p-4">
              <h3 className="font-bold text-ink">{group.name}</h3>
              <Badge tone="green">Clasificatoria</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-white text-left text-xs uppercase text-ink/55">
                  <tr>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-2 py-3">PJ</th>
                    <th className="px-2 py-3">DG</th>
                    <th className="px-4 py-3">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8">
                  {(rows.length > 0 ? rows : assignedTeamIds.map((teamId) => ({
                    id: `${group.id}-${teamId}`,
                    groupId: group.id,
                    teamId,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    points: 0
                  }))).map((row, index) => {
                    const team = teams.find((item) => item.id === row.teamId);
                    return (
                      <tr key={row.id} className={index < 2 ? "bg-field/5" : "bg-white"}>
                        <td className="px-4 py-3 font-semibold">
                          <button
                            type="button"
                            onClick={() => team && onOpenTeam?.(team)}
                            className="rounded text-left hover:text-field"
                          >
                            {getTeamName(teams, row.teamId)}
                          </button>
                        </td>
                        <td className="px-2 py-3">{row.played}</td>
                        <td className="px-2 py-3">{row.goalDifference}</td>
                        <td className="px-4 py-3 font-bold">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
