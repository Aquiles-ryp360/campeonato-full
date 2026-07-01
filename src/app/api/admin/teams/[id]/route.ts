import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError, type AdminClient } from "@/lib/server-access";
import {
  teamApprovalIssueMessage,
  validateTeamApproval
} from "@/lib/domain/registration-rules";
import type { Player, Team, TournamentEvent } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("validate_payment") }),
  z.object({ action: z.literal("approve"), observation: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal("observe"), observation: z.string().trim().min(3).max(1000) }),
  z.object({ action: z.literal("reject"), observation: z.string().trim().min(3).max(1000) })
]);

type EventRow = {
  id: string;
  status: TournamentEvent["status"];
  min_players: number;
  max_players: number;
  registration_open_until: string | null;
  max_teams: number;
};

type TeamRow = {
  id: string;
  event_id: string;
  name: string;
  delegate_name: string;
  delegate_phone: string;
  delegate_email: string | null;
  academic_career: string | null;
  status: Team["status"];
  admin_observation: string | null;
  payment_validated_at: string | null;
};

type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  student_code: string;
  enrollment_file: string | null;
  semester: string | null;
  lineup_role: Player["lineupRole"] | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: teamId } = await context.params;
    const input = actionSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);
    const team = await findTeam(admin, teamId);

    if (!team) {
      return jsonError("Equipo no encontrado.", 404);
    }

    if (input.action === "validate_payment") {
      const { error } = await admin
        .from("teams")
        .update({
          payment_validated_at: new Date().toISOString(),
          payment_validated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", teamId);

      if (error) return jsonError("No se pudo validar el pago.", 500);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "observe" || input.action === "reject") {
      const now = new Date().toISOString();
      const status = input.action === "observe" ? "observed" : "rejected";
      const actorColumn = input.action === "observe" ? "observed_by" : "rejected_by";
      const dateColumn = input.action === "observe" ? "observed_at" : "rejected_at";

      const { error } = await admin
        .from("teams")
        .update({
          status,
          admin_observation: input.observation,
          [dateColumn]: now,
          [actorColumn]: user.id,
          updated_at: now
        })
        .eq("id", teamId);

      if (error) return jsonError("No se pudo actualizar la revision.", 500);
      return NextResponse.json({ ok: true });
    }

    const issues = await approvalIssues(admin, team);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se puede aprobar todavia.",
          issues: issues.map(teamApprovalIssueMessage)
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("teams")
      .update({
        status: "approved",
        admin_observation: input.observation || null,
        approved_at: now,
        approved_by: user.id,
        updated_at: now
      })
      .eq("id", teamId);

    if (error) return jsonError("No se pudo aprobar el equipo.", 500);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? "Datos invalidos."
      : "No se pudo actualizar el equipo.";
    return jsonError(message, 400);
  }
}

async function approvalIssues(admin: AdminClient, team: TeamRow) {
  const event = await findEvent(admin, team.event_id);
  if (!event) {
    throw new ServerAccessError("Campeonato no encontrado.", 404);
  }

  const teams = await findEventTeams(admin, event.id);
  const teamIds = teams.map((item) => item.id);
  const players = await findPlayers(admin, teamIds);
  const currentPlayers = players.filter((player) => player.teamId === team.id);

  return validateTeamApproval({
    event: eventFromRow(event),
    team: teamFromRow(team),
    players: currentPlayers,
    allTeams: teams.map(teamFromRow),
    allPlayers: players
  });
}

async function findTeam(admin: AdminClient, teamId: string) {
  const { data, error } = await admin
    .from("teams")
    .select("id, event_id, name, delegate_name, delegate_phone, delegate_email, academic_career, status, admin_observation, payment_validated_at")
    .eq("id", teamId)
    .maybeSingle<TeamRow>();

  if (error) throw new ServerAccessError(error.message, 500);
  return data;
}

async function findEvent(admin: AdminClient, eventId: string) {
  const { data, error } = await admin
    .from("events")
    .select("id, status, min_players, max_players, registration_open_until, max_teams")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  if (error) throw new ServerAccessError(error.message, 500);
  return data;
}

async function findEventTeams(admin: AdminClient, eventId: string) {
  const { data, error } = await admin
    .from("teams")
    .select("id, event_id, name, delegate_name, delegate_phone, delegate_email, academic_career, status, admin_observation, payment_validated_at")
    .eq("event_id", eventId);

  if (error) throw new ServerAccessError(error.message, 500);
  return (data ?? []) as TeamRow[];
}

async function findPlayers(admin: AdminClient, teamIds: string[]) {
  if (teamIds.length === 0) return [];

  const { data, error } = await admin
    .from("players")
    .select("id, team_id, first_name, last_name, dni, student_code, enrollment_file, semester, lineup_role")
    .in("team_id", teamIds);

  if (error) throw new ServerAccessError(error.message, 500);
  return ((data ?? []) as PlayerRow[]).map(playerFromRow);
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
    minimumRestMinutes: 0
  };
}

function teamFromRow(row: TeamRow): Team {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    delegateName: row.delegate_name,
    delegatePhone: row.delegate_phone,
    delegateEmail: row.delegate_email ?? "",
    academicCareer: row.academic_career ?? undefined,
    paymentMethod: "yape",
    registrationCode: "",
    paymentStatus: row.payment_validated_at ? "verified" : "pending",
    status: row.status,
    adminObservation: row.admin_observation ?? undefined,
    paymentValidatedAt: row.payment_validated_at ?? undefined,
    primaryColor: "",
    secondaryColor: ""
  };
}

function playerFromRow(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    studentCode: row.student_code,
    enrollmentFile: row.enrollment_file ?? "",
    semester: row.semester ?? "",
    lineupRole: row.lineup_role ?? "starter"
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
