import { NextResponse } from "next/server";
import { z } from "zod";
import { sendDelegateAccessEmail } from "@/lib/mail";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import type { TeamStatus } from "@/lib/types";

export const runtime = "nodejs";

const teamReviewSchema = z.object({
  teamId: z.string().uuid("Selecciona un equipo valido."),
  action: z.enum(["approve", "observe", "delete"])
});

type TeamReviewInput = z.infer<typeof teamReviewSchema>;

type TeamReviewRow = {
  id: string;
  event_id: string;
  name: string;
  status: TeamStatus;
  registration_code_id: string | null;
  delegate_name: string;
  delegate_phone: string | null;
  delegate_email: string | null;
};

type EventReviewRow = {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
};

type PlayerReviewRow = {
  id: string;
  team_id: string;
  dni: string;
  student_code: string;
};

type MatchReviewRow = {
  id: string;
};

class AdminRouteError extends Error {
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

  const parsed = teamReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Datos invalidos para revisar el equipo.", 400);
  }

  try {
    await assertAdminRequest();
  } catch (error) {
    if (error instanceof AdminRouteError) return jsonError(error.message, error.status);

    return jsonError("No se pudo validar la sesion de administrador.", 401);
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase para revisar equipos.", 500);
  }

  try {
    const result = await reviewTeam(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminRouteError) return jsonError(error.message, error.status);

    console.error("Unexpected admin team review error", error);
    return jsonError("No se pudo revisar el equipo. Intentalo otra vez.", 500);
  }
}

async function assertAdminRequest() {
  const supabase = await createSupabaseRouteClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new AdminRouteError("Debes iniciar sesion como administrador.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle<{ role: string }>();

  if (profileError || profile?.role !== "admin") {
    throw new AdminRouteError("Solo el administrador puede revisar equipos.", 403);
  }
}

async function reviewTeam(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: TeamReviewInput
) {
  const team = await findTeam(supabase, input.teamId);

  if (input.action === "delete") {
    await deleteTeam(supabase, team);
    return { ok: true, deleted: true };
  }

  if (input.action === "approve") {
    const event = await assertTeamCanBeApproved(supabase, team);
    await updateTeamStatus(supabase, team.id, "approved");
    const emailSent = await notifyDelegateApproval(team, event);
    return { ok: true, status: "approved", emailSent };
  }

  await updateTeamStatus(supabase, team.id, "observed");
  return { ok: true, status: "observed" };
}

async function findTeam(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  teamId: string
) {
  const { data, error } = await supabase
    .from("teams")
    .select("id, event_id, name, status, registration_code_id, delegate_name, delegate_phone, delegate_email")
    .eq("id", teamId)
    .maybeSingle<TeamReviewRow>();

  if (error) throw new AdminRouteError("No se pudo validar el equipo.", 500);
  if (!data) throw new AdminRouteError("El equipo seleccionado no existe.", 404);

  return data;
}

async function assertTeamCanBeApproved(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  team: TeamReviewRow
) {
  const event = await findEvent(supabase, team.event_id);
  const eventTeams = await findEventTeams(supabase, team.event_id);
  const players = await findEventPlayers(supabase, eventTeams.map((item) => item.id));
  const teamPlayers = players.filter((player) => player.team_id === team.id);

  if (teamPlayers.length < event.min_players) {
    throw new AdminRouteError(
      `No se puede aprobar: faltan ${event.min_players - teamPlayers.length} jugador(es).`,
      409
    );
  }

  if (teamPlayers.length > event.max_players) {
    throw new AdminRouteError(
      `No se puede aprobar: excede el maximo por ${teamPlayers.length - event.max_players} jugador(es).`,
      409
    );
  }

  const duplicatedPlayers = findDuplicatedPlayers(team.id, players);
  if (duplicatedPlayers.length > 0) {
    throw new AdminRouteError(
      "No se puede aprobar: hay jugador(es) inscritos en otro equipo del mismo campeonato.",
      409
    );
  }

  return event;
}

async function findEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await supabase
    .from("events")
    .select("id, name, min_players, max_players")
    .eq("id", eventId)
    .maybeSingle<EventReviewRow>();

  if (error) throw new AdminRouteError("No se pudo validar el campeonato.", 500);
  if (!data) throw new AdminRouteError("El campeonato del equipo no existe.", 404);

  return data;
}

async function findEventTeams(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", eventId);

  if (error) throw new AdminRouteError("No se pudieron validar los equipos del campeonato.", 500);

  return (data ?? []) as Array<{ id: string }>;
}

async function findEventPlayers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  teamIds: string[]
) {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, dni, student_code")
    .in("team_id", teamIds);

  if (error) throw new AdminRouteError("No se pudieron validar los jugadores.", 500);

  return (data ?? []) as PlayerReviewRow[];
}

async function updateTeamStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  teamId: string,
  status: TeamStatus
) {
  const { error } = await supabase
    .from("teams")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", teamId);

  if (error) throw new AdminRouteError("No se pudo actualizar el estado del equipo.", 500);
}

async function notifyDelegateApproval(team: TeamReviewRow, event: EventReviewRow) {
  if (!team.delegate_email) return false;

  try {
    await sendDelegateAccessEmail({
      to: team.delegate_email,
      delegateName: team.delegate_name,
      teamName: team.name,
      eventName: event.name
    });
    return true;
  } catch (error) {
    console.error("Delegate approval email failed", error);
    return false;
  }
}

async function deleteTeam(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  team: TeamReviewRow
) {
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .limit(1);

  if (matchError) throw new AdminRouteError("No se pudo validar si el equipo tiene partidos.", 500);
  if (((matches ?? []) as MatchReviewRow[]).length > 0) {
    throw new AdminRouteError("No se puede eliminar un equipo que ya tiene partidos generados.", 409);
  }

  if (team.registration_code_id) {
    const { error: codeError } = await supabase
      .from("registration_codes")
      .update({
        status: "available",
        used_by_team_id: null
      })
      .eq("id", team.registration_code_id);

    if (codeError) throw new AdminRouteError("No se pudo liberar el codigo de inscripcion.", 500);
  }

  const { error } = await supabase.from("teams").delete().eq("id", team.id);
  if (error) throw new AdminRouteError("No se pudo eliminar el equipo.", 500);
}

function findDuplicatedPlayers(teamId: string, players: PlayerReviewRow[]) {
  const teamPlayers = players.filter((player) => player.team_id === teamId);
  const otherPlayers = players.filter((player) => player.team_id !== teamId);
  const otherKeys = new Set(otherPlayers.flatMap(playerKeys));

  return teamPlayers.filter((player) => playerKeys(player).some((key) => otherKeys.has(key)));
}

function playerKeys(player: PlayerReviewRow) {
  return [`dni:${normalizeKey(player.dni)}`, `code:${normalizeKey(player.student_code)}`].filter(
    (key) => !key.endsWith(":")
  );
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
