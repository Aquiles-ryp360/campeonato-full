import type { Player } from "@/lib/types";
import { PlayerTable } from "./PlayerTable";

export function TeamRoster({
  players,
  privateView = false
}: {
  players: Player[];
  privateView?: boolean;
}) {
  return <PlayerTable players={players} privateView={privateView} />;
}
