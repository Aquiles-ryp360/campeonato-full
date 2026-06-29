"use client";

import type { StandingRow, Team } from "@/lib/types";

export function StandingsTable({
  rows,
  onOpenTeam
}: {
  rows: StandingRow[];
  onOpenTeam?: (teamId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-mist text-left text-xs uppercase text-ink/55">
          <tr>
            <th className="px-5 py-3">Equipo</th>
            <th className="px-3 py-3">PJ</th>
            <th className="px-3 py-3">PG</th>
            <th className="px-3 py-3">PE</th>
            <th className="px-3 py-3">PP</th>
            <th className="px-3 py-3">DG</th>
            <th className="px-5 py-3">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/8">
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={row.teamId} className="bg-white">
                <td className="px-5 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => onOpenTeam?.(row.teamId)}
                    className="rounded text-left hover:text-field"
                  >
                    <span className="mr-3 text-ink/40">{index + 1}</span>
                    {row.teamName}
                  </button>
                </td>
                <td className="px-3 py-3">{row.played}</td>
                <td className="px-3 py-3">{row.won}</td>
                <td className="px-3 py-3">{row.drawn}</td>
                <td className="px-3 py-3">{row.lost}</td>
                <td className="px-3 py-3">{row.goalDifference}</td>
                <td className="px-5 py-3 font-bold">{row.points}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink/55">
                Todavia no hay datos para calcular posiciones.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TeamStandingSummary({
  teams
}: {
  teams: Team[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {teams.map((team) => (
        <div key={team.id} className="rounded-md border border-ink/10 bg-white p-4">
          <p className="truncate font-bold text-ink">{team.name}</p>
          <p className="mt-1 text-xs text-ink/55">{team.academicCareer ?? team.delegateName}</p>
        </div>
      ))}
    </div>
  );
}
