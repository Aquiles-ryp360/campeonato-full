"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import type { Player, PlayerRole, Team, TournamentEvent } from "@/lib/types";
import { canEditRoster } from "@/lib/domain/permissions";
import {
  canChangeJerseyNumberAfterStart,
  isEventStarted,
  rosterLimitState,
  validateEnrollmentFileMeta,
  validateJerseyNumber
} from "@/lib/domain/registration-rules";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { PlayerTable } from "@/features/teams/components/PlayerTable";

const footballPositions = ["Arquero", "Defensa", "Medio", "Delantero"];
const voleyPositions = ["Armador", "Punta", "Central", "Opuesto", "Libero"];

const emptyDraft = {
  firstName: "",
  lastName: "",
  dni: "",
  studentCode: "",
  semester: "",
  lineupRole: "starter" as PlayerRole,
  jerseyNumber: "",
  position: ""
};

export function DelegateRosterManager({
  event,
  team,
  players
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
}) {
  const router = useRouter();
  const editable = canEditRoster(event, team);
  const eventStarted = isEventStarted(event);
  const limit = rosterLimitState({ event, playerCount: players.length });
  const positions = event.sport === "voley" ? voleyPositions : footballPositions;
  const [draft, setDraft] = useState(emptyDraft);
  const [enrollmentFile, setEnrollmentFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [savingJerseyPlayerId, setSavingJerseyPlayerId] = useState<string | null>(null);
  const [jerseyValues, setJerseyValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((player) => [player.id, String(player.jerseyNumber ?? "")]))
  );
  const canAddMore = editable && players.length < event.maxPlayers;

  const jerseyNumbersInUse = useMemo(
    () => new Set(players.map((player) => player.jerseyNumber).filter(Boolean)),
    [players]
  );

  function updateDraft(field: keyof typeof emptyDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function addPlayer(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!canAddMore) return;

    if (!enrollmentFile) {
      toast.error("Selecciona la ficha de matricula del jugador.");
      return;
    }

    const fileError = validateEnrollmentFileMeta({
      type: enrollmentFile.type,
      size: enrollmentFile.size
    });
    if (fileError) {
      toast.error(fileError);
      return;
    }

    if (draft.jerseyNumber) {
      const jerseyError = validateJerseyNumber(draft.jerseyNumber);
      if (jerseyError) {
        toast.error(jerseyError);
        return;
      }
      if (jerseyNumbersInUse.has(Number(draft.jerseyNumber))) {
        toast.error("Ese numero de camiseta ya esta usado en el equipo.");
        return;
      }
    }

    setIsAdding(true);
    try {
      const formData = new FormData();
      formData.append("teamId", team.id);
      Object.entries(draft).forEach(([key, value]) => formData.append(key, value));
      formData.append("enrollmentFile", enrollmentFile);

      const response = await fetch("/api/delegate/players", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo agregar el jugador.");
        return;
      }

      toast.success("Jugador agregado.");
      setDraft(emptyDraft);
      setEnrollmentFile(null);
      router.refresh();
    } catch {
      toast.error("No se pudo agregar el jugador.");
    } finally {
      setIsAdding(false);
    }
  }

  async function saveJerseyNumber(player: Player) {
    const value = jerseyValues[player.id] ?? "";
    const jerseyError = validateJerseyNumber(value);
    if (jerseyError) {
      toast.error(jerseyError);
      return;
    }

    setSavingJerseyPlayerId(player.id);
    try {
      const response = await fetch("/api/delegate/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          playerId: player.id,
          jerseyNumber: Number(value)
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo cambiar el numero.");
        return;
      }

      toast.success("Numero actualizado.");
      router.refresh();
    } catch {
      toast.error("No se pudo cambiar el numero.");
    } finally {
      setSavingJerseyPlayerId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Plantel"
          description={`Minimo ${event.minPlayers}, maximo ${event.maxPlayers}. Estado: ${limit}.`}
          action={
            <Button
              form="delegate-add-player-form"
              type="submit"
              variant="secondary"
              disabled={!canAddMore || isAdding}
            >
              <Plus className="h-4 w-4" />
              {isAdding ? "Agregando..." : "Agregar jugador"}
            </Button>
          }
        />
      </div>
      <form id="delegate-add-player-form" className="p-5" onSubmit={addPlayer}>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Nombres">
            <input
              className={inputClass}
              value={draft.firstName}
              onChange={(changeEvent) => updateDraft("firstName", changeEvent.target.value)}
              disabled={!canAddMore}
              placeholder="Nombres"
            />
          </Field>
          <Field label="Apellidos">
            <input
              className={inputClass}
              value={draft.lastName}
              onChange={(changeEvent) => updateDraft("lastName", changeEvent.target.value)}
              disabled={!canAddMore}
              placeholder="Apellidos"
            />
          </Field>
          <Field label="DNI">
            <input
              className={inputClass}
              value={draft.dni}
              onChange={(changeEvent) => updateDraft("dni", changeEvent.target.value)}
              disabled={!canAddMore}
              placeholder="DNI"
            />
          </Field>
          <Field label="Codigo">
            <input
              className={inputClass}
              value={draft.studentCode}
              onChange={(changeEvent) => updateDraft("studentCode", changeEvent.target.value)}
              disabled={!canAddMore}
              placeholder="Codigo"
            />
          </Field>
          <Field label="Ciclo/Semestre">
            <input
              className={inputClass}
              value={draft.semester}
              onChange={(changeEvent) => updateDraft("semester", changeEvent.target.value)}
              disabled={!canAddMore}
              placeholder="Ciclo"
            />
          </Field>
          <Field label="Numero">
            <input
              className={inputClass}
              value={draft.jerseyNumber}
              onChange={(changeEvent) => updateDraft("jerseyNumber", changeEvent.target.value)}
              disabled={!canAddMore}
              type="number"
              min={1}
              max={99}
              placeholder="10"
            />
          </Field>
          <Field label="Posicion">
            <select
              className={inputClass}
              disabled={!canAddMore}
              value={draft.position}
              onChange={(changeEvent) => updateDraft("position", changeEvent.target.value)}
            >
              <option value="">Opcional</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rol">
            <select
              className={inputClass}
              disabled={!canAddMore}
              value={draft.lineupRole}
              onChange={(changeEvent) =>
                updateDraft("lineupRole", changeEvent.target.value as PlayerRole)
              }
            >
              <option value="starter">Titular</option>
              <option value="substitute">Suplente</option>
            </select>
          </Field>
          <Field label="Ficha de matricula">
            <input
              className={inputClass}
              disabled={!canAddMore}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(changeEvent) => setEnrollmentFile(changeEvent.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
      </form>
      <PlayerTable players={players} privateView />
      {eventStarted ? (
        <div className="border-t border-ink/10 p-5">
          <SectionHeader title="Camisetas" description="Cambio unico por jugador desde el inicio del campeonato." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {players.map((player) => {
              const canChange = canChangeJerseyNumberAfterStart(player);
              return (
                <div
                  key={player.id}
                  className="flex flex-col gap-3 rounded-md border border-ink/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-xs text-ink/55">
                      Actual: {player.jerseyNumber ?? "-"} - Cambios usados:{" "}
                      {player.jerseyNumberChangeCount ?? 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className={`${inputClass} w-24`}
                      value={jerseyValues[player.id] ?? ""}
                      onChange={(changeEvent) =>
                        setJerseyValues((current) => ({
                          ...current,
                          [player.id]: changeEvent.target.value
                        }))
                      }
                      type="number"
                      min={1}
                      max={99}
                      disabled={!canChange || savingJerseyPlayerId === player.id}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canChange || savingJerseyPlayerId === player.id}
                      onClick={() => void saveJerseyNumber(player)}
                    >
                      <Save className="h-4 w-4" />
                      Guardar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
