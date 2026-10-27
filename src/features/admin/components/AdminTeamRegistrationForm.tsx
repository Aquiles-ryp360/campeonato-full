"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { TournamentEvent } from "@/lib/types";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

type PlayerDraft = {
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  semester: string;
};

const emptyPlayer: PlayerDraft = { firstName: "", lastName: "", dni: "", studentCode: "", semester: "" };

const initialForm = {
  teamName: "",
  academicCareer: "",
  delegateName: "",
  delegatePhone: "",
  delegateEmail: "",
  paymentReceived: false
};

export function AdminTeamRegistrationForm({ events }: { events: TournamentEvent[] }) {
  const router = useRouter();
  const openEvents = events.filter((event) => event.status !== "finished");
  const [eventId, setEventId] = useState(openEvents[0]?.id ?? "");
  const [form, setForm] = useState(initialForm);
  const [players, setPlayers] = useState<PlayerDraft[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedEvent = openEvents.find((event) => event.id === eventId);
  const maxPlayers = selectedEvent?.maxPlayers ?? 10;

  function updatePlayer(index: number, field: keyof PlayerDraft, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? { ...player, [field]: value } : player)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) {
      toast.error("Selecciona un campeonato.");
      return;
    }

    // Filas totalmente vacias se ignoran; el plantel puede completarse despues.
    const filledPlayers = players.filter((player) => Object.values(player).some((value) => value.trim()));

    setSaving(true);
    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ...form, players: filledPlayers })
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo inscribir el equipo.");
        return;
      }

      toast.success(`Equipo "${form.teamName}" inscrito.`);
      setForm(initialForm);
      setPlayers([]);
      router.refresh();
    } catch {
      toast.error("No se pudo inscribir el equipo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Inscripcion por el administrador"
        description="Para equipos que entregan su ficha en fisico. No requiere codigo de pago; respeta el cupo maximo."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              href={eventId ? `/imprimir/ficha?evento=${eventId}` : undefined}
              disabled={!eventId}
            >
              <Printer className="h-4 w-4" />
              Ficha en blanco
            </Button>
            <Button variant={open ? "ghost" : "primary"} onClick={() => setOpen((value) => !value)}>
              <UserPlus className="h-4 w-4" />
              {open ? "Cerrar" : "Inscribir equipo"}
            </Button>
          </div>
        }
      />

      {open ? (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Campeonato">
              <select className={inputClass} value={eventId} onChange={(e) => setEventId(e.target.value)}>
                {openEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del equipo">
              <input
                className={inputClass}
                required
                value={form.teamName}
                onChange={(e) => setForm({ ...form, teamName: e.target.value })}
              />
            </Field>
            <Field label="Semestre / carrera">
              <input
                className={inputClass}
                placeholder="Ej. 5to semestre"
                value={form.academicCareer}
                onChange={(e) => setForm({ ...form, academicCareer: e.target.value })}
              />
            </Field>
            <Field label="Delegado">
              <input
                className={inputClass}
                required
                value={form.delegateName}
                onChange={(e) => setForm({ ...form, delegateName: e.target.value })}
              />
            </Field>
            <Field label="Celular del delegado">
              <input
                className={inputClass}
                required
                inputMode="tel"
                value={form.delegatePhone}
                onChange={(e) => setForm({ ...form, delegatePhone: e.target.value })}
              />
            </Field>
            <Field label="Correo (opcional)">
              <input
                className={inputClass}
                type="email"
                value={form.delegateEmail}
                onChange={(e) => setForm({ ...form, delegateEmail: e.target.value })}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.paymentReceived}
              onChange={(e) => setForm({ ...form, paymentReceived: e.target.checked })}
            />
            Pago de inscripcion recibido (el equipo queda aprobado)
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">
                Jugadores ({players.length}/{maxPlayers}) · opcional, se pueden copiar de la ficha despues
              </p>
              <Button
                variant="secondary"
                disabled={players.length >= maxPlayers}
                onClick={() => setPlayers((current) => [...current, { ...emptyPlayer }])}
              >
                <Plus className="h-4 w-4" />
                Agregar jugador
              </Button>
            </div>
            {players.map((player, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-brand-towerMid/25 p-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
                <input className={inputClass} placeholder="Nombres" value={player.firstName}
                  onChange={(e) => updatePlayer(index, "firstName", e.target.value)} />
                <input className={inputClass} placeholder="Apellidos" value={player.lastName}
                  onChange={(e) => updatePlayer(index, "lastName", e.target.value)} />
                <input className={inputClass} placeholder="DNI" inputMode="numeric" value={player.dni}
                  onChange={(e) => updatePlayer(index, "dni", e.target.value)} />
                <input className={inputClass} placeholder="Codigo" value={player.studentCode}
                  onChange={(e) => updatePlayer(index, "studentCode", e.target.value)} />
                <input className={inputClass} placeholder="Semestre" value={player.semester}
                  onChange={(e) => updatePlayer(index, "semester", e.target.value)} />
                <Button variant="danger" onClick={() => setPlayers((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Inscribir equipo"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
