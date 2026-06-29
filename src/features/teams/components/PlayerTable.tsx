import type { Player } from "@/lib/types";
import { playerRoleLabel } from "@/lib/utils";

export function PlayerTable({
  players,
  privateView = false
}: {
  players: Player[];
  privateView?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-mist text-left text-xs uppercase text-ink/55">
          <tr>
            <th className="px-4 py-3">Jugador</th>
            <th className="px-3 py-3">Rol</th>
            <th className="px-3 py-3">Camiseta</th>
            <th className="px-3 py-3">Posicion</th>
            {privateView ? <th className="px-3 py-3">Codigo</th> : null}
            {privateView ? <th className="px-4 py-3">DNI</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/8">
          {players.length > 0 ? (
            players.map((player) => (
              <tr key={player.id}>
                <td className="px-4 py-3 font-semibold">
                  {player.firstName} {player.lastName}
                </td>
                <td className="px-3 py-3">{playerRoleLabel(player.lineupRole)}</td>
                <td className="px-3 py-3">{player.jerseyNumber ?? "-"}</td>
                <td className="px-3 py-3">{player.position ?? "-"}</td>
                {privateView ? <td className="px-3 py-3">{player.studentCode}</td> : null}
                {privateView ? <td className="px-4 py-3">{player.dni}</td> : null}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={privateView ? 6 : 4}
                className="px-4 py-8 text-center text-sm text-ink/55"
              >
                Todavia no hay jugadores registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
