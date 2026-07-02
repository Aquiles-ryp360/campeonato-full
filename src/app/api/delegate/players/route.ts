import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { identityConsentTextVersion, maskDni } from "@/lib/identity/identity-lookup";
import { requireDelegateTeamAccess, ServerAccessError } from "@/lib/server-access";
import {
  canChangeJerseyNumberAfterStart,
  canDelegateEditBeforeStart,
  findCrossTeamDuplicate,
  findDuplicateNormalizedValue,
  isEventStarted,
  validateJerseyNumber
} from "@/lib/domain/registration-rules";
import {
  EnrollmentFileError,
  removeEnrollmentFiles,
  uploadEnrollmentFile,
  type UploadedEnrollmentFile
} from "@/lib/server/enrollment-files";
import type { Player, Team, TournamentEvent } from "@/lib/types";

export const runtime = "nodejs";

const addPlayerSchema = z.object({
  teamId: z.string().trim().min(1),
  firstName: z.string().trim().min(1, "Ingresa nombres del jugador."),
  lastName: z.string().trim().min(1, "Ingresa apellidos del jugador."),
  dni: z.string().trim().min(1, "Ingresa DNI del jugador."),
  studentCode: z.string().trim().min(1, "Ingresa codigo del jugador."),
  codigoCarrera: z.string().trim().optional().default(""),
  escuela: z.string().trim().optional().default(""),
  semester: z.string().trim().min(1, "Ingresa ciclo o semestre del jugador."),
  lineupRole: z.enum(["starter", "substitute"]).default("starter"),
  jerseyNumber: z.string().trim().optional().default(""),
  position: z.string().trim().max(60).optional().default(""),
  documentType: z.enum(["DNI", "UNAP_CODE", "MANUAL"]).default("MANUAL"),
  identitySource: z
    .enum(["manual", "unap_tramites", "dni_provider", "unap_docentes", "peruapi"])
    .default("manual"),
  verificationStatus: z
    .enum(["unverified", "auto_filled", "confirmed", "manual_review"])
    .default("unverified"),
  dataConsentAccepted: z.literal(true, {
    errorMap: () => ({
      message: "Acepta y confirma que cuentas con autorización para registrar estos datos."
    })
  }),
  dataConsentTextVersion: z.string().trim().default(identityConsentTextVersion)
});

const jerseyUpdateSchema = z.object({
  teamId: z.string().trim().min(1),
  playerId: z.string().trim().min(1),
  jerseyNumber: z.coerce.number()
});

type EventRow = {
  id: string;
  status: TournamentEvent["status"];
  registration_open_until: string | null;
  max_teams: number;
  min_players: number;
  max_players: number;
  event_date: string | null;
  schedule_config: TournamentEvent["scheduleConfig"] | null;
};

type TeamRow = {
  id: string;
  event_id: string;
  status: Team["status"];
};

type PlayerRow = {
  id: string;
  team_id: string;
  dni: string;
  student_code: string;
  codigo_carrera?: string | null;
  escuela?: string | null;
  document_type?: Player["documentType"] | null;
  dni_masked?: string | null;
  identity_source?: Player["identitySource"] | null;
  identity_verified_at?: string | null;
  data_consent_accepted_at?: string | null;
  data_consent_text_version?: string | null;
  registered_by_delegate_id?: string | null;
  verification_status?: Player["verificationStatus"] | null;
  jersey_number: number | null;
  jersey_number_change_count: number | null;
};

type CrossPlayerRow = Pick<PlayerRow, "team_id" | "dni" | "student_code">;

export async function POST(request: Request) {
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase.", 500);
  }

  try {
    const { input, file } = await parseAddPlayerRequest(request);
    const access = await requireDelegateTeamAccess(input.teamId, admin);
    const [event, team, currentPlayers] = await Promise.all([
      findEvent(admin, access.team.event_id),
      findTeam(admin, input.teamId),
      findTeamPlayers(admin, input.teamId)
    ]);

    if (!event || !team) {
      return jsonError("No se pudo validar la inscripcion.", 404);
    }

    const eventLike = eventFromRow(event);
    if (!canDelegateEditBeforeStart(eventLike)) {
      return jsonError("La inscripcion ya no permite agregar jugadores.", 409);
    }

    if (currentPlayers.length >= event.max_players) {
      return jsonError(`Este campeonato permite maximo ${event.max_players} jugadores.`, 409);
    }

    const playerDraft = {
      dni: input.dni,
      studentCode: input.studentCode
    };
    const repeatedDni = findDuplicateNormalizedValue([
      ...currentPlayers.map((player) => player.dni),
      input.dni
    ]);
    if (repeatedDni) {
      return jsonError(`El DNI ${repeatedDni} esta repetido en la plantilla.`, 400);
    }

    const repeatedCode = findDuplicateNormalizedValue([
      ...currentPlayers.map((player) => player.studentCode),
      input.studentCode
    ]);
    if (repeatedCode) {
      return jsonError(`El codigo ${repeatedCode} esta repetido en la plantilla.`, 400);
    }

    await assertNoCrossTeamDuplicates(admin, event.id, team.id, [playerDraft]);

    const jerseyNumber = input.jerseyNumber ? Number(input.jerseyNumber) : null;
    if (jerseyNumber !== null) {
      const jerseyError = validateJerseyNumber(jerseyNumber);
      if (jerseyError) return jsonError(jerseyError, 400);
      if (currentPlayers.some((player) => player.jerseyNumber === jerseyNumber)) {
        return jsonError("Ese numero de camiseta ya esta usado en el equipo.", 409);
      }
    }

    const uploadedFiles: UploadedEnrollmentFile[] = [];

    try {
      const uploaded = await uploadEnrollmentFile(admin, {
        eventId: event.id,
        teamId: team.id,
        file,
        label: `${input.studentCode}-${input.dni}`
      });
      uploadedFiles.push(uploaded);

      const { error } = await admin.from("players").insert({
        team_id: team.id,
        first_name: input.firstName,
        last_name: input.lastName,
        dni: input.dni,
        dni_masked: maskDni(input.dni),
        student_code: input.studentCode,
        codigo_carrera: input.codigoCarrera || null,
        escuela: input.escuela || null,
        semester: input.semester,
        enrollment_file: uploaded.dbPath,
        lineup_role: input.lineupRole,
        jersey_number: jerseyNumber,
        position: input.position || null,
        document_type: input.documentType,
        identity_source: input.identitySource,
        identity_verified_at:
          input.identitySource === "manual" ? null : new Date().toISOString(),
        data_consent_accepted_at: new Date().toISOString(),
        data_consent_text_version: input.dataConsentTextVersion,
        registered_by_delegate_id: access.user.id,
        verification_status: input.verificationStatus
      });

      if (error) {
        return jsonError("No se pudo agregar el jugador.", 500);
      }

      if (team.status === "approved") {
        await admin
          .from("teams")
          .update({ status: "observed", updated_at: new Date().toISOString() })
          .eq("id", team.id);
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      await removeEnrollmentFiles(admin, uploadedFiles);
      throw error;
    }
  } catch (error) {
    if (error instanceof ServerAccessError || error instanceof EnrollmentFileError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate player create error", error);
    return jsonError("No se pudo agregar el jugador.", 500);
  }
}

export async function PATCH(request: Request) {
  const parsed = jerseyUpdateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Datos invalidos.", 400);
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase.", 500);
  }

  try {
    const access = await requireDelegateTeamAccess(parsed.data.teamId, admin);
    const [event, players, player] = await Promise.all([
      findEvent(admin, access.team.event_id),
      findTeamPlayers(admin, parsed.data.teamId),
      findPlayer(admin, parsed.data.teamId, parsed.data.playerId)
    ]);

    if (!event || !player) {
      return jsonError("No se pudo validar el jugador.", 404);
    }

    if (!isEventStarted(eventFromRow(event))) {
      return jsonError("El cambio de camiseta posinicio aun no esta habilitado.", 409);
    }

    const jerseyError = validateJerseyNumber(parsed.data.jerseyNumber);
    if (jerseyError) {
      return jsonError(jerseyError, 400);
    }

    if (!canChangeJerseyNumberAfterStart(player)) {
      return jsonError("Este jugador ya uso su cambio de numero de camiseta.", 409);
    }

    if (
      players.some(
        (current) =>
          current.id !== parsed.data.playerId &&
          current.jerseyNumber === parsed.data.jerseyNumber
      )
    ) {
      return jsonError("Ese numero de camiseta ya esta usado en el equipo.", 409);
    }

    const { error } = await admin
      .from("players")
      .update({
        jersey_number: parsed.data.jerseyNumber,
        jersey_number_change_count: (player.jerseyNumberChangeCount ?? 0) + 1,
        jersey_number_changed_at: new Date().toISOString(),
        jersey_number_changed_by: access.user.id
      })
      .eq("id", parsed.data.playerId)
      .eq("team_id", parsed.data.teamId);

    if (error) {
      return jsonError("No se pudo cambiar el numero de camiseta.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate jersey update error", error);
    return jsonError("No se pudo cambiar el numero de camiseta.", 500);
  }
}

async function parseAddPlayerRequest(request: Request) {
  const formData = await request.formData();
  const body = {
    teamId: stringFormValue(formData, "teamId"),
    firstName: stringFormValue(formData, "firstName"),
    lastName: stringFormValue(formData, "lastName"),
    dni: stringFormValue(formData, "dni"),
    studentCode: stringFormValue(formData, "studentCode"),
    codigoCarrera: stringFormValue(formData, "codigoCarrera"),
    escuela: stringFormValue(formData, "escuela"),
    semester: stringFormValue(formData, "semester"),
    lineupRole: stringFormValue(formData, "lineupRole") || "starter",
    jerseyNumber: stringFormValue(formData, "jerseyNumber"),
    position: stringFormValue(formData, "position"),
    documentType: stringFormValue(formData, "documentType") || "MANUAL",
    identitySource: stringFormValue(formData, "identitySource") || "manual",
    verificationStatus: stringFormValue(formData, "verificationStatus") || "unverified",
    dataConsentAccepted: stringFormValue(formData, "dataConsentAccepted") === "true",
    dataConsentTextVersion:
      stringFormValue(formData, "dataConsentTextVersion") || identityConsentTextVersion
  };

  const parsed = addPlayerSchema.safeParse(body);
  if (!parsed.success) {
    throw new ServerAccessError(parsed.error.errors[0]?.message ?? "Datos invalidos.", 400);
  }

  const file = formData.get("enrollmentFile");
  if (!(file instanceof File) || file.size === 0) {
    throw new ServerAccessError("Todos los jugadores deben tener ficha de matricula.", 400);
  }

  return { input: parsed.data, file };
}

async function findEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await admin
    .from("events")
    .select("id, status, registration_open_until, max_teams, min_players, max_players, event_date, schedule_config")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  if (error) throw new ServerAccessError(error.message, 500);
  return data;
}

async function findTeam(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  teamId: string
) {
  const { data, error } = await admin
    .from("teams")
    .select("id, event_id, status")
    .eq("id", teamId)
    .maybeSingle<TeamRow>();

  if (error) throw new ServerAccessError(error.message, 500);
  return data;
}

async function findTeamPlayers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  teamId: string
) {
  const { data, error } = await admin
    .from("players")
    .select(
      "id, team_id, dni, student_code, codigo_carrera, escuela, document_type, dni_masked, identity_source, identity_verified_at, data_consent_accepted_at, data_consent_text_version, registered_by_delegate_id, verification_status, jersey_number, jersey_number_change_count"
    )
    .eq("team_id", teamId);

  if (error) throw new ServerAccessError(error.message, 500);

  return (data ?? []).map((player: PlayerRow): Player => ({
    id: player.id,
    teamId: player.team_id,
    firstName: "",
    lastName: "",
    dni: player.dni,
    studentCode: player.student_code,
    codigoCarrera: player.codigo_carrera ?? undefined,
    escuela: player.escuela ?? undefined,
    documentType: player.document_type ?? undefined,
    dniMasked: player.dni_masked ?? undefined,
    identitySource: player.identity_source ?? undefined,
    identityVerifiedAt: player.identity_verified_at ?? undefined,
    dataConsentAcceptedAt: player.data_consent_accepted_at ?? undefined,
    dataConsentTextVersion: player.data_consent_text_version ?? undefined,
    registeredByDelegateId: player.registered_by_delegate_id ?? undefined,
    verificationStatus: player.verification_status ?? undefined,
    enrollmentFile: "",
    semester: "",
    lineupRole: "starter",
    jerseyNumber: player.jersey_number ?? undefined,
    jerseyNumberChangeCount: player.jersey_number_change_count ?? undefined
  }));
}

async function findPlayer(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  teamId: string,
  playerId: string
) {
  const players = await findTeamPlayers(admin, teamId);
  return players.find((player) => player.id === playerId) ?? null;
}

async function assertNoCrossTeamDuplicates(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  currentTeamId: string,
  players: Array<Pick<Player, "dni" | "studentCode">>
) {
  const { data: teamsData, error: teamsError } = await admin
    .from("teams")
    .select("id, event_id, status")
    .eq("event_id", eventId)
    .in("status", ["registered", "observed", "approved"]);

  if (teamsError) throw new ServerAccessError(teamsError.message, 500);

  const teams = (teamsData ?? []).map((team: TeamRow) => ({
    id: team.id,
    eventId: team.event_id,
    status: team.status
  }));
  const teamIds = teams.map((team) => team.id);
  if (teamIds.length === 0) return;

  const { data: playersData, error: playersError } = await admin
    .from("players")
    .select("team_id, dni, student_code")
    .in("team_id", teamIds);

  if (playersError) throw new ServerAccessError(playersError.message, 500);

  const existingPlayers = ((playersData ?? []) as CrossPlayerRow[]).map((player) => ({
    teamId: player.team_id,
    dni: player.dni,
    studentCode: player.student_code
  }));

  const duplicateDni = findCrossTeamDuplicate({
    players,
    existingPlayers,
    existingTeams: teams,
    currentTeamId,
    field: "dni"
  });
  if (duplicateDni) {
    throw new ServerAccessError(
      `El DNI ${duplicateDni} ya esta inscrito en otro equipo de este campeonato.`,
      409
    );
  }

  const duplicateStudentCode = findCrossTeamDuplicate({
    players,
    existingPlayers,
    existingTeams: teams,
    currentTeamId,
    field: "studentCode"
  });
  if (duplicateStudentCode) {
    throw new ServerAccessError(
      `El codigo ${duplicateStudentCode} ya esta inscrito en otro equipo de este campeonato.`,
      409
    );
  }
}

function eventFromRow(row: EventRow): TournamentEvent {
  return {
    id: row.id,
    name: "",
    sportId: "",
    sport: "futsal",
    category: "",
    formatId: "",
    format: "league",
    status: row.status,
    registrationFee: 0,
    registrationOpenUntil: row.registration_open_until ?? "",
    maxTeams: row.max_teams,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    pointsWin: 0,
    pointsDraw: 0,
    pointsLoss: 0,
    rulesSummary: "",
    preventCrossSportConflicts: false,
    minimumRestMinutes: 0,
    eventDate: row.event_date ?? undefined,
    scheduleConfig: row.schedule_config ?? undefined
  };
}

function stringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
