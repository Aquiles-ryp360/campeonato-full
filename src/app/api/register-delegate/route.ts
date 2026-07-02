import { NextResponse } from "next/server";
import { z } from "zod";
import { sendDelegateAccessEmail } from "@/lib/mail";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { identityConsentTextVersion, maskDni } from "@/lib/identity/identity-lookup";
import {
  findCrossTeamDuplicate,
  findDuplicateNormalizedValue,
  registrationAvailability,
  registrationClosedMessage
} from "@/lib/domain/registration-rules";
import {
  EnrollmentFileError,
  removeEnrollmentFiles,
  uploadEnrollmentFile,
  type UploadedEnrollmentFile
} from "@/lib/server/enrollment-files";
import type { Player, Team } from "@/lib/types";

export const runtime = "nodejs";

const playerSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa nombres del jugador."),
  lastName: z.string().trim().min(1, "Ingresa apellidos del jugador."),
  dni: z.string().trim().min(1, "Ingresa DNI del jugador."),
  studentCode: z.string().trim().min(1, "Ingresa codigo del jugador."),
  codigoCarrera: z.string().trim().optional().default(""),
  escuela: z.string().trim().optional().default(""),
  enrollmentFile: z.string().trim().optional().default(""),
  semester: z.string().trim().min(1, "Ingresa ciclo o semestre del jugador."),
  lineupRole: z.enum(["starter", "substitute"]).default("starter"),
  documentType: z.enum(["DNI", "UNAP_CODE", "MANUAL"]).default("MANUAL"),
  identitySource: z
    .enum(["manual", "unap_tramites", "dni_provider", "unap_docentes", "peruapi"])
    .default("manual"),
  verificationStatus: z
    .enum(["unverified", "auto_filled", "confirmed", "manual_review"])
    .default("unverified")
});

const registrationSchema = z.object({
  eventId: z.string().trim().min(1, "Selecciona un campeonato."),
  teamName: z.string().trim().min(2, "Ingresa el nombre del equipo."),
  delegateName: z.string().trim().min(2, "Ingresa el nombre del delegado."),
  delegatePhone: z.string().trim().min(6, "Ingresa el celular del delegado."),
  delegateEmail: z.string().trim().email("Ingresa un correo valido.").toLowerCase(),
  paymentMethod: z.enum(["yape", "plin"]),
  registrationCode: z.string().trim().min(3, "Ingresa el codigo unico."),
  dataConsentAccepted: z.literal(true, {
    errorMap: () => ({
      message: "Acepta y confirma que cuentas con autorización para registrar estos datos."
    })
  }),
  dataConsentTextVersion: z.string().trim().default(identityConsentTextVersion),
  players: z.array(playerSchema).min(1, "Registra al menos un jugador.")
});

type RegistrationInput = z.infer<typeof registrationSchema>;

type ParsedRegistrationRequest = {
  input: RegistrationInput;
  enrollmentFiles: File[];
};

type EventRow = {
  id: string;
  name: string;
  status: "draft" | "registration" | "in_progress" | "finished";
  registration_open_until: string | null;
  max_teams: number;
  min_players: number;
  max_players: number;
};

type RegistrationCodeRow = {
  id: string;
  method: "yape" | "plin";
  status: "available" | "used" | "revoked";
  used_by_team_id: string | null;
};

type TeamRow = {
  id: string;
  event_id: string;
  status: Team["status"];
};

type PlayerRow = {
  team_id: string;
  dni: string;
  student_code: string;
};

type ExistingProfileRow = {
  role: "admin" | "delegate" | "referee" | "viewer";
  phone: string | null;
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
  let parsedRequest: ParsedRegistrationRequest;

  try {
    parsedRequest = await parseRegistrationRequest(request);
  } catch (error) {
    if (error instanceof PublicRouteError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Datos de inscripcion invalidos.", 400);
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase para registrar equipos.", 500);
  }

  try {
    const result = await registerDelegateTeam(supabase, parsedRequest);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicRouteError || error instanceof EnrollmentFileError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate registration error", error);
    return jsonError("No se pudo completar la inscripcion. Intentalo otra vez.", 500);
  }
}

async function parseRegistrationRequest(request: Request): Promise<ParsedRegistrationRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    throw new PublicRouteError("La inscripcion debe enviarse con archivos de matricula.", 400);
  }

  const formData = await request.formData();
  const rawPlayers = formData.get("players");

  if (typeof rawPlayers !== "string") {
    throw new PublicRouteError("Falta la plantilla de jugadores.", 400);
  }

  let players: unknown;
  try {
    players = JSON.parse(rawPlayers);
  } catch {
    throw new PublicRouteError("La plantilla de jugadores no es valida.", 400);
  }

  const body = {
    eventId: stringFormValue(formData, "eventId"),
    teamName: stringFormValue(formData, "teamName"),
    delegateName: stringFormValue(formData, "delegateName"),
    delegatePhone: stringFormValue(formData, "delegatePhone"),
    delegateEmail: stringFormValue(formData, "delegateEmail"),
    paymentMethod: stringFormValue(formData, "paymentMethod"),
    registrationCode: stringFormValue(formData, "registrationCode"),
    dataConsentAccepted: stringFormValue(formData, "dataConsentAccepted") === "true",
    dataConsentTextVersion:
      stringFormValue(formData, "dataConsentTextVersion") || identityConsentTextVersion,
    players
  };

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    throw new PublicRouteError(formatValidationError(parsed.error), 400);
  }

  const enrollmentFiles = parsed.data.players.map((_, index) => {
    const file = formData.get(`enrollmentFile-${index}`);
    if (!(file instanceof File) || file.size === 0) {
      throw new PublicRouteError("Todos los jugadores deben tener ficha de matricula.", 400);
    }
    return file;
  });

  return { input: parsed.data, enrollmentFiles };
}

async function registerDelegateTeam(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  { input, enrollmentFiles }: ParsedRegistrationRequest
) {
  const event = await findEvent(supabase, input.eventId);

  if (!event) {
    throw new PublicRouteError("El campeonato seleccionado no existe.", 404);
  }

  const activeTeamCount = await countActiveRegisteredTeams(supabase, event.id);
  const availability = registrationAvailability({
    event: {
      status: event.status,
      registrationOpenUntil: event.registration_open_until ?? "",
      maxTeams: event.max_teams
    },
    teamCount: activeTeamCount
  });

  if (!availability.open) {
    throw new PublicRouteError(registrationClosedMessage(availability.reason), 409);
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

  if (input.players.length !== enrollmentFiles.length) {
    throw new PublicRouteError("Todos los jugadores deben tener ficha de matricula.", 400);
  }

  const repeatedDni = findDuplicateNormalizedValue(input.players.map((player) => player.dni));
  if (repeatedDni) {
    throw new PublicRouteError(`El DNI ${repeatedDni} esta repetido en la plantilla.`, 400);
  }

  const repeatedStudentCode = findDuplicateNormalizedValue(
    input.players.map((player) => player.studentCode)
  );
  if (repeatedStudentCode) {
    throw new PublicRouteError(
      `El codigo ${repeatedStudentCode} esta repetido en la plantilla.`,
      400
    );
  }

  await assertNoCrossTeamDuplicates(supabase, event.id, input.players);

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

  let createdTeamId: string | null = null;
  let registrationCodeMarkedUsed = false;
  let emailSent = false;
  const uploadedFiles: UploadedEnrollmentFile[] = [];

  try {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
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
    const teamId = team.id;

    for (const [index, player] of input.players.entries()) {
      const uploaded = await uploadEnrollmentFile(supabase, {
        eventId: event.id,
        teamId,
        file: enrollmentFiles[index],
        label: `${player.studentCode}-${player.dni}`
      });
      uploadedFiles.push(uploaded);
    }

    const { error: playersError } = await supabase.from("players").insert(
      input.players.map((player, index) => ({
        team_id: teamId,
        first_name: player.firstName,
        last_name: player.lastName,
        dni: player.dni,
        dni_masked: maskDni(player.dni),
        student_code: player.studentCode,
        codigo_carrera: player.codigoCarrera || null,
        escuela: player.escuela || null,
        enrollment_file: uploadedFiles[index].dbPath,
        semester: player.semester,
        lineup_role: player.lineupRole,
        document_type: player.documentType,
        identity_source: player.identitySource,
        identity_verified_at:
          player.identitySource === "manual" ? null : new Date().toISOString(),
        data_consent_accepted_at: new Date().toISOString(),
        data_consent_text_version: input.dataConsentTextVersion,
        verification_status: player.verificationStatus
      }))
    );

    if (playersError) {
      console.error("Player roster insert failed", {
        code: playersError.code,
        message: playersError.message,
        details: playersError.details,
        hint: playersError.hint
      });
      throw playerRosterError(playersError);
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

    await promoteExistingViewerToDelegate(supabase, {
      teamId,
      delegateEmail: input.delegateEmail,
      delegateName: input.delegateName,
      delegatePhone: input.delegatePhone
    });

    try {
      const emailInfo = await sendDelegateAccessEmail({
        to: input.delegateEmail,
        delegateName: input.delegateName,
        teamName: input.teamName,
        eventName: event.name
      });
      emailSent = true;
      console.info("Delegate access email sent", {
        to: input.delegateEmail,
        teamId: createdTeamId,
        messageId: emailInfo.messageId,
        accepted: emailInfo.accepted,
        rejected: emailInfo.rejected,
        response: emailInfo.response
      });
    } catch (emailError) {
      console.error("Delegate access email failed", {
        to: input.delegateEmail,
        teamId: createdTeamId,
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }

    return {
      ok: true,
      teamId: createdTeamId,
      emailSent,
      delegateAccess: {
        email: input.delegateEmail,
        provider: "google",
        loginUrl: "/login"
      }
    };
  } catch (error) {
    await cleanupRegistration(supabase, {
      teamId: createdTeamId,
      registrationCodeId: registrationCode.id,
      resetRegistrationCode: registrationCodeMarkedUsed,
      uploadedFiles
    });

    throw error;
  }
}

async function promoteExistingViewerToDelegate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    teamId,
    delegateEmail,
    delegateName,
    delegatePhone
  }: {
    teamId: string;
    delegateEmail: string;
    delegateName: string;
    delegatePhone: string;
  }
) {
  const userId = await findAuthUserIdByEmail(supabase, delegateEmail);
  if (!userId) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, phone")
    .eq("id", userId)
    .maybeSingle<ExistingProfileRow>();

  if (profileError) {
    throw new PublicRouteError("No se pudo validar la cuenta existente del delegado.", 500);
  }

  if (profile?.role !== "admin") {
    const { error: profileUpdateError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        role: "delegate",
        full_name: delegateName,
        phone: profile?.phone ?? delegatePhone,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    if (profileUpdateError) {
      throw new PublicRouteError("No se pudo actualizar la cuenta del delegado.", 500);
    }
  }

  const { error: teamUpdateError } = await supabase
    .from("teams")
    .update({
      delegate_user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq("id", teamId);

  if (teamUpdateError) {
    throw new PublicRouteError("No se pudo vincular la cuenta con el equipo.", 500);
  }
}

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  let page = 1;
  const perPage = 1000;
  const normalizedEmail = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new PublicRouteError("No se pudo buscar la cuenta existente del delegado.", 500);
    }

    const user = data.users.find((current) => current.email?.trim().toLowerCase() === normalizedEmail);
    if (user) return user.id;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

async function findEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const query = supabase
    .from("events")
    .select("id, name, status, registration_open_until, max_teams, min_players, max_players")
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

async function countActiveRegisteredTeams(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { count, error } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["registered", "observed", "approved"]);

  if (error) {
    throw new PublicRouteError("No se pudo validar el cupo del campeonato.", 500);
  }

  return count ?? 0;
}

async function assertNoCrossTeamDuplicates(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  players: RegistrationInput["players"]
) {
  const teams = await findActiveEventTeams(supabase, eventId);
  const teamIds = teams.map((team) => team.id);
  if (teamIds.length === 0) return;

  const { data, error } = await supabase
    .from("players")
    .select("team_id, dni, student_code")
    .in("team_id", teamIds);

  if (error) {
    throw new PublicRouteError("No se pudo validar jugadores ya inscritos.", 500);
  }

  const existingPlayers: Array<Pick<Player, "teamId" | "dni" | "studentCode">> =
    (data ?? []).map((player: PlayerRow) => ({
      teamId: player.team_id,
      dni: player.dni,
      studentCode: player.student_code
    }));

  const duplicateDni = findCrossTeamDuplicate({
    players,
    existingPlayers,
    existingTeams: teams,
    field: "dni"
  });
  if (duplicateDni) {
    throw new PublicRouteError(
      `El DNI ${duplicateDni} ya esta inscrito en otro equipo de este campeonato.`,
      409
    );
  }

  const duplicateStudentCode = findCrossTeamDuplicate({
    players,
    existingPlayers,
    existingTeams: teams,
    field: "studentCode"
  });
  if (duplicateStudentCode) {
    throw new PublicRouteError(
      `El codigo ${duplicateStudentCode} ya esta inscrito en otro equipo de este campeonato.`,
      409
    );
  }
}

async function findActiveEventTeams(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await supabase
    .from("teams")
    .select("id, event_id, status")
    .eq("event_id", eventId)
    .in("status", ["registered", "observed", "approved"]);

  if (error) {
    throw new PublicRouteError("No se pudo validar inscripciones existentes.", 500);
  }

  return (data ?? []).map((team: TeamRow) => ({
    id: team.id,
    eventId: team.event_id,
    status: team.status
  }));
}

async function cleanupRegistration(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    teamId,
    registrationCodeId,
    resetRegistrationCode,
    uploadedFiles
  }: {
    teamId: string | null;
    registrationCodeId: string;
    resetRegistrationCode: boolean;
    uploadedFiles: UploadedEnrollmentFile[];
  }
) {
  await removeEnrollmentFiles(supabase, uploadedFiles);

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
}

function stringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function formatValidationError(error: z.ZodError) {
  const issue = error.errors[0];

  if (!issue) {
    return "Datos de inscripcion invalidos.";
  }

  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return "Faltan datos obligatorios de la inscripcion.";
  }

  return issue.message;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function playerRosterError(error: { code?: string; message?: string }) {
  if (error.code === "23505" || error.message?.includes("players_team_id_dni_key")) {
    return new PublicRouteError("Hay jugadores con DNI repetido en la plantilla.", 400);
  }

  if (error.code === "23502") {
    return new PublicRouteError("Completa los datos obligatorios de todos los jugadores.", 400);
  }

  return new PublicRouteError("No se pudo guardar la plantilla de jugadores.", 500);
}
