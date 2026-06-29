"use client";

import { Save } from "lucide-react";
import type { Team, TournamentEvent } from "@/lib/types";
import { canEditRegistration } from "@/lib/domain/permissions";
import { isRegistrationOpen } from "@/lib/domain/registration-rules";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function DelegateRegistrationForm({
  event,
  team
}: {
  event: TournamentEvent;
  team: Team;
}) {
  const editable = canEditRegistration(event, team);

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
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del equipo">
          <input className={inputClass} defaultValue={team.name} disabled={!editable} />
        </Field>
        <Field label="Delegado">
          <input className={inputClass} defaultValue={team.delegateName} disabled={!editable} />
        </Field>
        <Field label="Celular">
          <input className={inputClass} defaultValue={team.delegatePhone} disabled={!editable} />
        </Field>
        <Field label="Correo">
          <input className={inputClass} defaultValue={team.delegateEmail} disabled />
        </Field>
        <Field label="Carrera / escuela">
          <input className={inputClass} defaultValue={team.academicCareer ?? ""} disabled={!editable} />
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
      <div className="mt-4 rounded-md bg-mist p-4 text-sm text-ink/65">
        Observaciones del admin: sin observaciones registradas.
      </div>
      <div className="mt-5 flex justify-end">
        <Button disabled={!editable}>
          <Save className="h-4 w-4" />
          {isRegistrationOpen(event) ? "Guardar cambios" : "Solo lectura"}
        </Button>
      </div>
    </Card>
  );
}
