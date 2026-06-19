import { NextResponse } from "next/server";
import { z } from "zod";
import { sendDelegateCredentialsEmail } from "@/lib/mail";
import { generateTemporaryPassword } from "@/lib/password";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const playerSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa nombres del jugador."),
  lastName: z.string().trim().min(1, "Ingresa apellidos del jugador."),
  dni: z.string().trim().min(1, "Ingresa DNI del jugador."),
  studentCode: z.string().trim().min(1, "Ingresa codigo del jugador."),
  enrollmentFile: z.string().trim().optional().default(""),
  semester: z.string().trim().optional().default(""),
  lineupRole: z.enum(["starter", "substitute"]).default("starter")
});

const registrationSchema = z.object({
  eventId: z.string().trim().min(1, "Selecciona un campeonato."),
  teamName: z.string().trim().min(2, "Ingresa el nombre del equipo."),
  delegateName: z.string().trim().min(2, "Ingresa el nombre del delegado."),
  delegatePhone: z.string().trim().min(6, "Ingresa el celular del delegado."),
  delegateEmail: z.string().trim().email("Ingresa un correo valido.").toLowerCase(),
  paymentMethod: z.enum(["yape", "plin"]),
  registrationCode: z.string().trim().min(3, "Ingresa el codigo unico."),
  players: z.array(playerSchema).min(1, "Registra al menos un jugador.")
});

type RegistrationInput = z.infer<typeof registrationSchema>;

type EventRow = {
  id: string;
  name: string;
  status: "draft" | "registration" | "in_progress" | "finished";
  min_players: number;
  max_players: number;
};

type RegistrationCodeRow = {
  id: string;
  method: "yape" | "plin";
  status: "available" | "used" | "revoked";
  used_by_team_id: string | null;
};

class PublicRouteError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("El cuerpo de la solicitud no es JSON valido.", 400);
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Datos de inscripcion invalidos.", 400);
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase para registrar equipos.", 500);
  }

  try {
    const result = await registerDelegateTeam(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicRouteError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate registration error", error);
    return jsonError("No se pudo completar la inscripcion. Intentalo otra vez.", 500);
  }
}

async function registerDelegateTeam(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: RegistrationInput
) {
  const event = await findEvent(supabase, input.eventId);

  if (!event) {
    throw new PublicRouteError("El campeonato seleccionado no existe.", 404);
  }

  if (!["draft", "registration"].includes(event.status)) {
    throw new PublicRouteError("Este campeonato no esta abierto para inscripciones.", 409);
  }

  if (input.players.length < event.min_players) {
    throw new PublicRouteError(
      `Este campeonato pide minimo ${event.min_players} jugadores.`,
      400
    );
  }

  if (input.players.length > event.max_players) {
    throw new PublicRouteError(
      `Este campeonato permite maximo ${event.max_players} jugadores.`,
      400
    );
  }

  const registrationCode = await findRegistrationCode(
    supabase,
    event.id,
    input.registrationCode
  );

  if (!registrationCode) {
    throw new PublicRouteError("El codigo de inscripcion no existe para este campeonato.", 404);
  }

  if (registrationCode.status !== "available" || registrationCode.used_by_team_id) {
    throw new PublicRouteError("Este codigo de inscripcion ya fue usado o no esta disponible.", 409);
  }

  if (registrationCode.method !== input.paymentMethod) {
    throw new PublicRouteError(
      `Este codigo corresponde a ${registrationCode.method.toUpperCase()}.`,
      400
    );
  }

  const password = generateTemporaryPassword();
  const username = input.delegateEmail;
  let createdUserId: string | null = null;
  let createdTeamId: string | null = null;
  let registrationCodeMarkedUsed = false;

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: input.delegateEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: "delegate",
      full_name: input.delegateName,
      team_name: input.teamName
    }
  });

  if (createUserError || !createdUser.user) {
    throw new PublicRouteError(
      createUserError?.message.toLowerCase().includes("already")
        ? "Ya existe un usuario registrado con ese correo."
        : "No se pudo crear el usuario delegado en Supabase Auth.",
      400
    );
  }

  createdUserId = createdUser.user.id;

  try {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: createdUserId,
        role: "delegate",
        full_name: input.delegateName,
        phone: input.delegatePhone,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new PublicRouteError("No se pudo crear el perfil del delegado.", 500);
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        delegate_user_id: createdUserId,
        name: input.teamName,
        delegate_name: input.delegateName,
        delegate_phone: input.delegatePhone,
        delegate_email: input.delegateEmail,
        registration_code_id: registrationCode.id,
        status: "registered"
      })
      .select("id")
      .single();

    if (teamError || !team) {
      throw new PublicRouteError("No se pudo crear el equipo. Revisa si el nombre ya existe.", 409);
    }

    createdTeamId = team.id;

    const { error: playersError } = await supabase.from("players").insert(
      input.players.map((player) => ({
        team_id: createdTeamId,
        first_name: player.firstName,
        last_name: player.lastName,
        dni: player.dni,
        student_code: player.studentCode,
        enrollment_file: player.enrollmentFile,
        semester: player.semester,
        lineup_role: player.lineupRole
      }))
    );

    if (playersError) {
      throw new PublicRouteError("No se pudo guardar la plantilla de jugadores.", 500);
    }

    const { data: updatedCode, error: codeUpdateError } = await supabase
      .from("registration_codes")
      .update({
        status: "used",
        used_by_team_id: createdTeamId
      })
      .eq("id", registrationCode.id)
      .eq("status", "available")
      .is("used_by_team_id", null)
      .select("id")
      .maybeSingle();

    if (codeUpdateError || !updatedCode) {
      throw new PublicRouteError("Este codigo acaba de ser usado por otra inscripcion.", 409);
    }

    registrationCodeMarkedUsed = true;

    try {
      await sendDelegateCredentialsEmail({
        to: input.delegateEmail,
        delegateName: input.delegateName,
        teamName: input.teamName,
        eventName: event.name,
        username,
        password
      });
    } catch (emailError) {
      console.error("Delegate credentials email failed", emailError);
      throw new PublicRouteError(
        "La inscripcion no se completo porque no se pudo enviar el correo al delegado.",
        502
      );
    }

    return {
      ok: true,
      teamId: createdTeamId,
      emailSent: true,
      delegateCredentials: {
        username,
        password
      }
    };
  } catch (error) {
    await cleanupRegistration(supabase, {
      userId: createdUserId,
      teamId: createdTeamId,
      registrationCodeId: registrationCode.id,
      resetRegistrationCode: registrationCodeMarkedUsed
    });

    throw error;
  }
}

async function findEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const query = supabase
    .from("events")
    .select("id, name, status, min_players, max_players")
    .limit(1);
  const response = isUuid(eventId)
    ? await query.eq("id", eventId).maybeSingle<EventRow>()
    : await query.eq("slug", eventId).maybeSingle<EventRow>();

  if (response.error) {
    throw new PublicRouteError("No se pudo validar el campeonato seleccionado.", 500);
  }

  return response.data;
}

async function findRegistrationCode(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  code: string
) {
  const { data, error } = await supabase
    .from("registration_codes")
    .select("id, method, status, used_by_team_id")
    .eq("event_id", eventId)
    .eq("code", code)
    .maybeSingle<RegistrationCodeRow>();

  if (error) {
    throw new PublicRouteError("No se pudo validar el codigo de inscripcion.", 500);
  }

  return data;
}

async function cleanupRegistration(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    userId,
    teamId,
    registrationCodeId,
    resetRegistrationCode
  }: {
    userId: string | null;
    teamId: string | null;
    registrationCodeId: string;
    resetRegistrationCode: boolean;
  }
) {
  if (resetRegistrationCode && teamId) {
    await supabase
      .from("registration_codes")
      .update({
        status: "available",
        used_by_team_id: null
      })
      .eq("id", registrationCodeId)
      .eq("used_by_team_id", teamId);
  }

  if (teamId) {
    await supabase.from("teams").delete().eq("id", teamId);
  }

  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
