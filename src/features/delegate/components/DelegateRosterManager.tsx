"use client";

import { Download, Plus } from "lucide-react";
import type { Player, Team, TournamentEvent } from "@/lib/types";
import { canEditRoster } from "@/lib/domain/permissions";
import { rosterLimitState } from "@/lib/domain/registration-rules";
import { playerRoleLabel } from "@/lib/utils";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { PlayerTable } from "@/features/teams/components/PlayerTable";

const footballPositions = ["Arquero", "Defensa", "Medio", "Delantero"];
const voleyPositions = ["Armador", "Punta", "Central", "Opuesto", "Libero"];

export function DelegateRosterManager({
  event,
  team,
  players
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
}) {
  const editable = canEditRoster(event, team);
  const limit = rosterLimitState({ event, playerCount: players.length });
  const positions = event.sport === "voley" ? voleyPositions : footballPositions;
  const canDownloadRoster = team.status === "approved";

  function downloadRoster() {
    const rows = [
      ["#", "Nombres", "Apellidos", "DNI", "Codigo", "Semestre", "Rol", "Camiseta", "Posicion"],
      ...players.map((player, index) => [
        String(index + 1),
        player.firstName,
        player.lastName,
        player.dni,
        player.studentCode,
        player.semester,
        playerRoleLabel(player.lineupRole),
        player.jerseyNumber?.toString() ?? "",
        player.position ?? ""
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jugadores-${slugify(team.name)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Plantel"
          description={`Minimo ${event.minPlayers}, maximo ${event.maxPlayers}. Estado: ${limit}. La descarga se habilita cuando administracion aprueba el equipo.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadRoster} disabled={!canDownloadRoster}>
                <Download className="h-4 w-4" />
                Descargar lista
              </Button>
              <Button variant="secondary" disabled={!editable}>
                <Plus className="h-4 w-4" />
                Agregar jugador
              </Button>
            </div>
          }
        />
      </div>
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Nombres">
            <input className={inputClass} disabled={!editable} placeholder="Nombres" />
          </Field>
          <Field label="Apellidos">
            <input className={inputClass} disabled={!editable} placeholder="Apellidos" />
          </Field>
          <Field label="Numero">
            <input className={inputClass} disabled={!editable} type="number" min={0} placeholder="10" />
          </Field>
          <Field label="Posicion">
            <select className={inputClass} disabled={!editable} defaultValue="">
              <option value="">Opcional</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <PlayerTable players={players} privateView />
    </Card>
  );
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "equipo";
}
