"use client";

import { useMemo, useState } from "react";
import { Plus, Smartphone, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { events } from "@/lib/mock-data";
import type { PlayerRole } from "@/lib/types";
import { formatDateTime, formatMoney, sportLabel } from "@/lib/utils";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

interface PlayerFormRow {
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  enrollmentFile: string;
  semester: string;
  lineupRole: PlayerRole;
}

const emptyPlayer: PlayerFormRow = {
  firstName: "",
  lastName: "",
  dni: "",
  studentCode: "",
  enrollmentFile: "",
  semester: "",
  lineupRole: "starter"
};

const playerRoleOptions: Array<{ value: PlayerRole; label: string }> = [
  { value: "starter", label: "Titular" },
  { value: "substitute", label: "Suplente" }
];

export function RegistrationForm() {
  const openEvents = events.filter((event) => event.status === "registration" || event.status === "draft");
  const [eventId, setEventId] = useState(openEvents[0]?.id ?? events[0]?.id ?? "");
  const [teamName, setTeamName] = useState("");
  const [delegateName, setDelegateName] = useState("");
  const [delegatePhone, setDelegatePhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"yape" | "plin">("yape");
  const [registrationCode, setRegistrationCode] = useState("");
  const [players, setPlayers] = useState<PlayerFormRow[]>([
    { ...emptyPlayer },
    { ...emptyPlayer },
    { ...emptyPlayer }
  ]);

  const event = useMemo(
    () => events.find((current) => current.id === eventId) ?? events[0],
    [eventId]
  );

  function updatePlayer(index: number, field: keyof PlayerFormRow, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
      )
    );
  }

  function removePlayer(index: number) {
    setPlayers((current) => current.filter((_, playerIndex) => playerIndex !== index));
  }

  function submitRegistration(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    const completedPlayers = players.filter(
      (player) => player.firstName && player.lastName && player.dni && player.studentCode
    );

    if (!teamName || !delegateName || !delegatePhone || !registrationCode) {
      toast.error("Completa equipo, delegado y codigo unico de inscripcion.");
      return;
    }

    if (completedPlayers.length < event.minPlayers) {
      toast.error(`Este campeonato pide minimo ${event.minPlayers} jugadores.`);
      return;
    }

    toast.success("Inscripcion registrada. El codigo queda marcado como usado.");
  }

  return (
    <form className="space-y-6 pb-20 md:pb-0" onSubmit={submitRegistration}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <Card className="p-5">
          <SectionHeader
            eyebrow="Inscripcion autonoma"
            title="Datos del equipo"
            description="El delegado elige campeonato, registra su equipo y usa el codigo entregado despues del pago."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Campeonato">
              <select
                className={inputClass}
                value={eventId}
                onChange={(changeEvent) => setEventId(changeEvent.target.value)}
              >
                {events.map((current) => (
                  <option key={current.id} value={current.id}>
                    {current.name} - {sportLabel(current.sport)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del equipo">
              <input
                className={inputClass}
                value={teamName}
                onChange={(changeEvent) => setTeamName(changeEvent.target.value)}
                placeholder="Ej. Los Invencibles"
              />
            </Field>
            <Field label="Delegado">
              <input
                className={inputClass}
                value={delegateName}
                onChange={(changeEvent) => setDelegateName(changeEvent.target.value)}
                placeholder="Nombre completo"
              />
            </Field>
            <Field label="Celular">
              <input
                className={inputClass}
                value={delegatePhone}
                onChange={(changeEvent) => setDelegatePhone(changeEvent.target.value)}
                placeholder="999 999 999"
              />
            </Field>
            <Field label="Codigo unico">
              <input
                className={inputClass}
                value={registrationCode}
                onChange={(changeEvent) => setRegistrationCode(changeEvent.target.value)}
                placeholder="Ej. FUT-2026-AB7K"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Pago" description="El cobro lo realiza el encargado y entrega un codigo de un solo uso." />
          <div className="mt-5 rounded-lg border border-ink/10 bg-mist p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-field">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-ink/60">Monto de inscripcion</p>
                <p className="text-2xl font-bold text-ink">{formatMoney(event.registrationFee)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["yape", "plin"] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-md border px-3 py-2 text-sm font-bold uppercase transition ${
                    paymentMethod === method
                      ? "border-field bg-field text-white"
                      : "border-ink/10 bg-white text-ink"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink/65">
              <p>
                Cierre: <strong>{formatDateTime(event.registrationOpenUntil)}</strong>
              </p>
              <p>
                Jugadores: <strong>{event.minPlayers}</strong> minimo,{" "}
                <strong>{event.maxPlayers}</strong> maximo.
              </p>
            </div>
            <div className="mt-4">
              <Badge tone="amber">El admin carga lotes de codigos y cada codigo se usa una vez</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Jugadores"
          description="DNI, codigo universitario, ficha de matricula y ciclo/semestre. Foto queda opcional para despues."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPlayers((current) => [...current, { ...emptyPlayer }])}
            >
              <Plus className="h-4 w-4" />
              Agregar jugador
            </Button>
          }
        />

        <div className="mt-5 space-y-3">
          {players.map((player, index) => (
            <div key={index} className="rounded-md border border-ink/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">Jugador {index + 1}</p>
                  <Badge tone={player.lineupRole === "starter" ? "green" : "blue"}>
                    {player.lineupRole === "starter" ? "Titular" : "Suplente"}
                  </Badge>
                </div>
                {players.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePlayer(index)}
                    className="grid h-9 w-9 place-items-center rounded-md text-ink/55 hover:bg-red-50 hover:text-red-700"
                    aria-label="Eliminar jugador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className={inputClass}
                  value={player.firstName}
                  onChange={(changeEvent) => updatePlayer(index, "firstName", changeEvent.target.value)}
                  placeholder="Nombres"
                />
                <input
                  className={inputClass}
                  value={player.lastName}
                  onChange={(changeEvent) => updatePlayer(index, "lastName", changeEvent.target.value)}
                  placeholder="Apellidos"
                />
                <input
                  className={inputClass}
                  value={player.dni}
                  onChange={(changeEvent) => updatePlayer(index, "dni", changeEvent.target.value)}
                  placeholder="DNI"
                />
                <input
                  className={inputClass}
                  value={player.studentCode}
                  onChange={(changeEvent) => updatePlayer(index, "studentCode", changeEvent.target.value)}
                  placeholder="Codigo"
                />
                <input
                  className={inputClass}
                  value={player.enrollmentFile}
                  onChange={(changeEvent) => updatePlayer(index, "enrollmentFile", changeEvent.target.value)}
                  readOnly
                  placeholder="Ficha de matricula"
                  title="Nombre del archivo seleccionado"
                />
                <input
                  className={inputClass}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(changeEvent) =>
                    updatePlayer(
                      index,
                      "enrollmentFile",
                      changeEvent.target.files?.[0]?.name ?? ""
                    )
                  }
                />
                <input
                  className={inputClass}
                  value={player.semester}
                  onChange={(changeEvent) => updatePlayer(index, "semester", changeEvent.target.value)}
                  placeholder="Ciclo/Semestre"
                />
                <select
                  className={inputClass}
                  value={player.lineupRole}
                  onChange={(changeEvent) =>
                    updatePlayer(index, "lineupRole", changeEvent.target.value as PlayerRole)
                  }
                  aria-label={`Rol del jugador ${index + 1}`}
                >
                  {playerRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Enviar inscripcion
        </Button>
      </div>
    </form>
  );
}
