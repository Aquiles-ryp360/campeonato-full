import { NextResponse } from "next/server";
import { requireRole, routeError } from "@/lib/server-access";
import { buildDuplicateRosterAlerts } from "@/lib/domain/team-review";

export const runtime = "nodejs";

type PaymentRow = {
  id: string;
  team_id: string;
  event_id: string;
  status: string;
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, profile } = await requireRole("admin");
    const reviewedAt = new Date().toISOString();
    const { data: payment, error: paymentError } = await supabase
      .from("team_payments")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
        rejection_reason: null,
        updated_at: reviewedAt
      })
      .eq("id", id)
      .select("id, team_id, event_id, status")
      .single<PaymentRow>();

    if (paymentError) throw paymentError;

    await supabase
      .from("teams")
      .update({ payment_status: "approved", updated_at: reviewedAt })
      .eq("id", payment.team_id);

    const autoApproved = await maybeAutoApproveTeam(supabase, payment.team_id, payment.event_id, reviewedAt);

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: autoApproved ? "aprobacion_pago_y_equipo_auto" : "aprobacion_pago",
      entity_table: "team_payments",
      entity_id: payment.id,
      payload: { actorRole: profile.role, teamId: payment.team_id, eventId: payment.event_id }
    });

    return NextResponse.json({ ok: true, paymentStatus: "approved", autoApproved });
  } catch (error) {
    return routeError(error, "No se pudo aprobar el pago.");
  }
}

async function maybeAutoApproveTeam(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  teamId: string,
  eventId: string,
  now: string
) {
  const { data: event } = await supabase
    .from("events")
    .select("id, min_players, max_players, auto_approve_after_payment")
    .eq("id", eventId)
    .maybeSingle<{ id: string; min_players: number; max_players: number; auto_approve_after_payment: boolean }>();

  if (!event?.auto_approve_after_payment) return false;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, event_id, name, delegate_name, delegate_phone, delegate_email, status, payment_status")
    .eq("event_id", eventId);
  const { data: players } = await supabase.from("players").select("id, team_id, first_name, last_name, dni, student_code, enrollment_file, semester, lineup_role").in(
    "team_id",
    (teams ?? []).map((team) => team.id)
  );

  const currentTeams = (teams ?? []).map((team) => ({
    id: team.id,
    eventId: team.event_id,
    name: team.name,
    delegateName: team.delegate_name,
    delegatePhone: team.delegate_phone,
    delegateEmail: team.delegate_email ?? "",
    paymentMethod: "yape" as const,
    registrationCode: "",
    paymentStatus: team.payment_status,
    status: team.status,
    primaryColor: "#111827",
    secondaryColor: "#ffffff"
  }));
  const currentPlayers = (players ?? []).map((player) => ({
    id: player.id,
    teamId: player.team_id,
    firstName: player.first_name,
    lastName: player.last_name,
    dni: player.dni,
    studentCode: player.student_code,
    enrollmentFile: player.enrollment_file ?? "",
    semester: player.semester ?? "",
    lineupRole: player.lineup_role ?? "starter"
  }));
  const targetPlayers = currentPlayers.filter((player) => player.teamId === teamId);
  const duplicated = buildDuplicateRosterAlerts(currentTeams, currentPlayers).some((alert) =>
    targetPlayers.some((player) => player.dni === alert.value || player.studentCode === alert.value)
  );

  if (targetPlayers.length < event.min_players || targetPlayers.length > event.max_players || duplicated) {
    return false;
  }

  const { error } = await supabase.from("teams").update({ status: "approved", updated_at: now }).eq("id", teamId);
  return !error;
}
