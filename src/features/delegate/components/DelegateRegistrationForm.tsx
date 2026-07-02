"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { Team, TournamentEvent } from "@/lib/types";
import { canEditRegistration } from "@/lib/domain/permissions";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function DelegateRegistrationForm({
  event,
  team
}: {
  event: TournamentEvent;
  team: Team;
}) {
  const editable = canEditRegistration(event, team);
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [delegateName, setDelegateName] = useState(team.delegateName);
  const [delegatePhone, setDelegatePhone] = useState(team.delegatePhone);
  const [academicCareer, setAcademicCareer] = useState(team.academicCareer ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function submitChanges(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!editable) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/delegate/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          name,
          delegateName,
          delegatePhone,
          academicCareer
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo guardar la inscripcion.");
        return;
      }

      toast.success("Inscripcion actualizada.");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar la inscripcion.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Mi inscripcion"
        description={
          editable
            ? "Puedes editar mientras las inscripciones sigan abiertas."
            : "La inscripcion esta cerrada o en modo solo lectura."
        }
      />
      <form onSubmit={submitChanges}>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del equipo">
          <input
            className={inputClass}
            value={name}
            onChange={(eventChange) => setName(eventChange.target.value)}
            disabled={!editable}
          />
        </Field>
        <Field label="Delegado">
          <input
            className={inputClass}
            value={delegateName}
            onChange={(eventChange) => setDelegateName(eventChange.target.value)}
            disabled={!editable}
          />
        </Field>
        <Field label="Celular">
          <input
            className={inputClass}
            value={delegatePhone}
            onChange={(eventChange) => setDelegatePhone(eventChange.target.value)}
            disabled={!editable}
          />
        </Field>
        <Field label="Correo">
          <input className={inputClass} defaultValue={team.delegateEmail} disabled />
        </Field>
        <Field label="Carrera / escuela">
          <input
            className={inputClass}
            value={academicCareer}
            onChange={(eventChange) => setAcademicCareer(eventChange.target.value)}
            disabled={!editable}
          />
        </Field>
        <Field label="Campeonato">
          <input className={inputClass} defaultValue={event.name} disabled />
        </Field>
        <Field label="Metodo de pago">
          <input className={inputClass} defaultValue={team.paymentMethod.toUpperCase()} disabled />
        </Field>
        <Field label="Codigo de inscripcion">
          <input className={inputClass} defaultValue={team.registrationCode} disabled />
        </Field>
        <Field label="Estado de pago">
          <input className={inputClass} defaultValue={team.paymentStatus} disabled />
        </Field>
        <Field label="Estado de inscripcion">
          <input className={inputClass} defaultValue={team.status} disabled />
        </Field>
      </div>
      <div className="mt-4 rounded-md border border-brand-towerMid/25 bg-brand-wash p-4 text-sm font-semibold text-brand-muted">
        Observaciones del admin: {team.adminObservation || "sin observaciones registradas."}
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={!editable || isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Guardando..." : editable ? "Guardar cambios" : "Solo lectura"}
        </Button>
      </div>
      </form>
    </Card>
  );
}
