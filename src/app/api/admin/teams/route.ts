import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";
import { maskDni } from "@/lib/identity/identity-lookup";
import { findDuplicateNormalizedValue } from "@/lib/domain/registration-rules";

export const runtime = "nodejs";

// Inscripcion directa por el admin (equipos que entregan su ficha en fisico).
// No usa codigo de pago ni respeta el cierre de inscripcion, pero si el cupo maximo.
const playerSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa nombres del jugador."),
  lastName: z.string().trim().min(1, "Ingresa apellidos del jugador."),
  dni: z.string().trim().min(1, "Ingresa DNI del jugador."),
  studentCode: z.string().trim().min(1, "Ingresa codigo del jugador."),
  semester: z.string().trim().min(1, "Ingresa semestre del jugador.")
});

const payloadSchema = z.object({
  eventId: z.string().trim().uuid("Selecciona un campeonato."),
  teamName: z.string().trim().min(2, "Ingresa el nombre del equipo."),
  academicCareer: z.string().trim().max(120).optional().default(""),
  delegateName: z.string().trim().min(2, "Ingresa el nombre del delegado."),
  delegatePhone: z.string().trim().min(6, "Ingresa el celular del delegado."),
  delegateEmail: z.union([z.literal(""), z.string().trim().email("Correo invalido.").toLowerCase()]).default(""),
  paymentReceived: z.boolean().default(false),
  players: z.array(playerSchema).default([])
});

const activeStatuses = ["registered", "observed", "approved"];

type EventRow = {
  id: string;
  name: string;
  max_teams: number;
  max_players: number;
};

export async function POST(request: Request) {
  try {
    const input = payloadSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, name, max_teams, max_players")
      .eq("id", input.eventId)
      .maybeSingle<EventRow>();

    if (eventError) throw new ServerAccessError(eventError.message, 500);
    if (!event) return jsonError("El campeonato seleccionado no existe.", 404);

    const { data: activeTeams, error: teamsError } = await admin
      .from("teams")
      .select("id")
      .eq("event_id", event.id)
      .in("status", activeStatuses);

    if (teamsError) throw new ServerAccessError(teamsError.message, 500);
    if ((activeTeams?.length ?? 0) >= event.max_teams) {
      return jsonError(`El campeonato ya tiene el cupo completo (${event.max_teams} equipos).`, 409);
    }

    if (input.players.length > event.max_players) {
      return jsonError(`Este campeonato permite maximo ${event.max_players} jugadores.`, 400);
    }

    const repeatedDni = findDuplicateNormalizedValue(input.players.map((player) => player.dni));
    if (repeatedDni) return jsonError(`El DNI ${repeatedDni} esta repetido en la plantilla.`, 400);

    const repeatedCode = findDuplicateNormalizedValue(input.players.map((player) => player.studentCode));
    if (repeatedCode) return jsonError(`El codigo ${repeatedCode} esta repetido en la plantilla.`, 400);

    const crossTeamMessage = await findCrossTeamDuplicate(
      admin,
      (activeTeams ?? []).map((team) => team.id as string),
      input.players
    );
    if (crossTeamMessage) return jsonError(crossTeamMessage, 409);

    const now = new Date().toISOString();
    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({
        event_id: event.id,
        name: input.teamName,
        academic_career: input.academicCareer || null,
        delegate_name: input.delegateName,
        delegate_phone: input.delegatePhone,
        delegate_email: input.delegateEmail || null,
        // Con el pago recibido queda aprobado, igual que la inscripcion con codigo.
        status: input.paymentReceived ? "approved" : "registered",
        admin_observation: "Inscrito por el administrador (ficha en fisico).",
        payment_validated_at: input.paymentReceived ? now : null,
        payment_validated_by: input.paymentReceived ? user.id : null,
        approved_at: input.paymentReceived ? now : null,
        approved_by: input.paymentReceived ? user.id : null
      })
      .select("id")
      .single();

    if (teamError || !team) {
      return jsonError("No se pudo crear el equipo. Revisa si el nombre ya existe en este campeonato.", 409);
    }

    if (input.players.length > 0) {
      const { error: playersError } = await admin.from("players").insert(
        input.players.map((player) => ({
          team_id: team.id,
          first_name: player.firstName,
          last_name: player.lastName,
          dni: player.dni,
          dni_masked: maskDni(player.dni),
          student_code: player.studentCode,
          enrollment_file: "",
          semester: player.semester,
          lineup_role: "starter",
          document_type: "MANUAL",
          identity_source: "manual",
          verification_status: "manual_review"
        }))
      );

      if (playersError) {
        await admin.from("teams").delete().eq("id", team.id);
        return jsonError("No se pudo guardar la plantilla de jugadores.", 500);
      }
    }

    return NextResponse.json({ ok: true, teamId: team.id });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? "Datos invalidos."
      : "No se pudo inscribir el equipo.";
    return jsonError(message, 400);
  }
}

async function findCrossTeamDuplicate(
  admin: AdminClient,
  teamIds: string[],
  players: Array<{ dni: string; studentCode: string }>
) {
  if (teamIds.length === 0 || players.length === 0) return null;

  const { data, error } = await admin
    .from("players")
    .select("dni, student_code")
    .in("team_id", teamIds);

  if (error) throw new ServerAccessError(error.message, 500);

  const normalize = (value: string) => value.trim().toLowerCase();
  const existingDni = new Set((data ?? []).map((row) => normalize(row.dni as string)));
  const existingCodes = new Set((data ?? []).map((row) => normalize(row.student_code as string)));

  const dni = players.find((player) => existingDni.has(normalize(player.dni)))?.dni;
  if (dni) return `El DNI ${dni} ya esta inscrito en otro equipo de este campeonato.`;

  const code = players.find((player) => existingCodes.has(normalize(player.studentCode)))?.studentCode;
  if (code) return `El codigo ${code} ya esta inscrito en otro equipo de este campeonato.`;

  return null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
