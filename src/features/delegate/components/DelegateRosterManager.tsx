"use client";

import { Plus } from "lucide-react";
import type { Player, Team, TournamentEvent } from "@/lib/types";
import { canEditRoster } from "@/lib/domain/permissions";
import { rosterLimitState } from "@/lib/domain/registration-rules";
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

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Plantel"
          description={`Minimo ${event.minPlayers}, maximo ${event.maxPlayers}. Estado: ${limit}.`}
          action={
            <Button variant="secondary" disabled={!editable}>
              <Plus className="h-4 w-4" />
              Agregar jugador
            </Button>
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
