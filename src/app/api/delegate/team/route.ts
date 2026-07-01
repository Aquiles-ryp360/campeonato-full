import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireDelegateTeamAccess, ServerAccessError } from "@/lib/server-access";
import { canDelegateEditBeforeStart } from "@/lib/domain/registration-rules";
import type { Team, TournamentEvent } from "@/lib/types";

export const runtime = "nodejs";

const updateTeamSchema = z.object({
  teamId: z.string().trim().min(1),
  name: z.string().trim().min(2, "Ingresa el nombre del equipo."),
  delegateName: z.string().trim().min(2, "Ingresa el nombre del delegado."),
  delegatePhone: z.string().trim().min(6, "Ingresa el celular del delegado."),
  academicCareer: z.string().trim().max(120).optional().default("")
});

type EventRow = {
  id: string;
  status: TournamentEvent["status"];
  registration_open_until: string | null;
  max_teams: number;
  event_date: string | null;
  schedule_config: TournamentEvent["scheduleConfig"] | null;
};

type TeamRow = {
  id: string;
  status: Team["status"];
};

export async function PATCH(request: Request) {
  const parsed = updateTeamSchema.safeParse(await request.json().catch(() => null));

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
    const [event, team] = await Promise.all([
      findEvent(admin, access.team.event_id),
      findTeam(admin, parsed.data.teamId)
    ]);

    if (!event || !team) {
      return jsonError("No se pudo validar la inscripcion.", 404);
    }

    if (!canDelegateEditBeforeStart(eventFromRow(event))) {
      return jsonError("La inscripcion ya no permite editar datos del equipo.", 409);
    }

    const nextStatus = team.status === "approved" ? "observed" : team.status;

    const { error } = await admin
      .from("teams")
      .update({
        name: parsed.data.name,
        delegate_name: parsed.data.delegateName,
        delegate_phone: parsed.data.delegatePhone,
        academic_career: parsed.data.academicCareer || null,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", parsed.data.teamId);

    if (error) {
      return jsonError("No se pudo guardar la inscripcion.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate team update error", error);
    return jsonError("No se pudo guardar la inscripcion.", 500);
  }
}

async function findEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await admin
    .from("events")
    .select("id, status, registration_open_until, max_teams, event_date, schedule_config")
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
    .select("id, status")
    .eq("id", teamId)
    .maybeSingle<TeamRow>();

  if (error) throw new ServerAccessError(error.message, 500);
  return data;
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
    minPlayers: 0,
    maxPlayers: 0,
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

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
