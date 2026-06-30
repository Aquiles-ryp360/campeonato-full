import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateKnockoutBracket } from "@/lib/domain/bracket-generator";
import { generateOneDaySchedule } from "@/lib/domain/schedule-generator";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import type { FixtureStatus, SeedingMode, Team } from "@/lib/types";

export const runtime = "nodejs";

const drawFixtureSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato valido."),
  categoryId: z.string().uuid("Selecciona una categoria.").optional(),
  randomSeed: z.string().trim().optional(),
  allowPaymentOverride: z.boolean().optional().default(false),
  overrideValidatedResults: z.boolean().optional().default(false)
});

type DrawFixtureInput = z.infer<typeof drawFixtureSchema>;

type EventDrawRow = {
  id: string;
  name: string;
  event_date: string | null;
  fixture_status: FixtureStatus | null;
  seeding_mode: SeedingMode | null;
  third_place: boolean | null;
  minimum_rest_minutes: number | null;
  fixture_compact_preview: boolean | null;
  schedule_config: {
    startTime?: string;
    matchDurationMinutes?: number;
    transitionMinutes?: number;
    courts?: string[];
    minimumRestMinutes?: number;
    allowCompactPreview?: boolean;
  } | null;
};

type TeamDrawRow = {
  id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  status: "pending_payment" | "registered" | "observed" | "approved";
  payment_status: "pending" | "review" | "approved" | "rejected" | "verified";
  created_at: string | null;
};

type VenueDrawRow = {
  id: string;
  name: string;
  active: boolean;
};

type ExistingMatchRow = {
  id: string;
  status: "scheduled" | "in_progress" | "submitted" | "validated" | "disputed" | "cancelled" | "finished" | "walkover" | "postponed";
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

  const parsed = drawFixtureSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Datos invalidos para generar la programacion.", 400);
  }

  try {
    await assertAdminRequest();
  } catch (error) {
    if (error instanceof AdminRouteError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("No se pudo validar la sesion de administrador.", 401);
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase para guardar la programacion.", 500);
  }

  try {
    const result = await drawAndPersistFixture(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminRouteError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected admin schedule error", error);
    return jsonError("No se pudo guardar la programacion. Intentalo otra vez.", 500);
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
    throw new AdminRouteError("Solo el administrador puede generar la programacion.", 403);
  }
}

async function drawAndPersistFixture(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: DrawFixtureInput
) {
  const event = await findEvent(supabase, input.eventId);
  const teams = await findDrawableTeams(supabase, event.id, input.categoryId, input.allowPaymentOverride);

  if (teams.length < 2) {
    throw new AdminRouteError("Se necesitan al menos 2 equipos aprobados y con pago aprobado para programar.", 400);
  }

  const existingMatches = await findEventMatches(supabase, event.id);
  if (!input.overrideValidatedResults && existingMatches.some((match) => match.status === "validated" || match.status === "finished")) {
    throw new AdminRouteError("No se puede regenerar la programacion porque ya existen resultados validados.", 409);
  }

  const venues = await findAssignedVenues(supabase, event.id);
  if (venues.length === 0) {
    throw new AdminRouteError("Debes asignar canchas al campeonato antes de generar la programacion.", 400);
  }

  const timeSlots = await findActiveTimeSlotCount(supabase);
  if (timeSlots === 0) {
    throw new AdminRouteError("Debes configurar horarios disponibles antes de generar la programacion.", 400);
  }

  if (input.allowPaymentOverride || input.overrideValidatedResults) {
    await auditScheduleOverride(supabase, {
      eventId: event.id,
      allowPaymentOverride: input.allowPaymentOverride,
      overrideValidatedResults: input.overrideValidatedResults
    });
  }

  const seed = input.randomSeed || `${event.id}-${Date.now()}`;
  const bracket = generateKnockoutBracket({
    eventId: event.id,
    teams,
    matches: [],
    thirdPlace: event.third_place ?? true,
    seedingMode: event.seeding_mode ?? "registration_order",
    randomSeed: seed,
    fixtureStatus: "published"
  });
  const schedule = generateOneDaySchedule(bracket.matches, {
    eventDate: event.event_date ?? new Date().toISOString(),
    startTime: event.schedule_config?.startTime ?? "09:00",
    matchDurationMinutes: event.schedule_config?.matchDurationMinutes ?? 90,
    transitionMinutes: event.schedule_config?.transitionMinutes ?? 10,
    courts: venues.map((venue) => venue.name),
    minimumRestMinutes: event.schedule_config?.minimumRestMinutes ?? event.minimum_rest_minutes ?? 120,
    respectRoundDependencies: true,
    allowCompactPreview: event.schedule_config?.allowCompactPreview ?? event.fixture_compact_preview ?? true
  });
  const matches = assignStableMatchIds(schedule.matches, seed);
  const venueByName = new Map(venues.map((venue) => [venue.name, venue]));

  let deleteQuery = supabase.from("matches").delete().eq("event_id", event.id);
  if (input.categoryId) deleteQuery = deleteQuery.eq("category_id", input.categoryId);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    throw new AdminRouteError("No se pudo limpiar la programacion anterior.", 500);
  }

  const { error: insertError } = await supabase.from("matches").insert(
    matches.map((match) => ({
      id: match.id,
      event_id: event.id,
      round: match.round,
      stage: match.stage,
      group_id: match.groupId ?? null,
      bracket_position: match.bracketPosition ?? null,
      label: match.label ?? null,
      home_team_id: match.homeTeamId || null,
      away_team_id: match.awayTeamId || null,
      category_id: input.categoryId ?? teams[0]?.categoryId ?? null,
      home_placeholder: match.homePlaceholder ?? null,
      away_placeholder: match.awayPlaceholder ?? null,
      home_source_match_id: match.homeSourceMatchId ?? null,
      away_source_match_id: match.awaySourceMatchId ?? null,
      source_match_ids: match.sourceMatchIds ?? [],
      depends_on_match_ids: match.dependsOnMatchIds ?? [],
      scheduled_at: match.scheduledAt,
      scheduled_end_at: match.scheduledEndAt ?? null,
      venue_id: venueByName.get(match.court)?.id ?? null,
      status: match.status,
      fixture_status: "published",
      is_fixture_preliminary: false,
      notes: match.notes ?? "Programacion automatica generada por el administrador."
    }))
  );

  if (insertError) {
    throw new AdminRouteError("No se pudieron guardar los partidos programados.", 500);
  }

  const { error: eventUpdateError } = await supabase
    .from("events")
    .update({
      fixture_status: "published",
      seeding_mode: "random"
    })
    .eq("id", event.id);

  if (eventUpdateError) {
    throw new AdminRouteError("Se guardaron los partidos, pero no se pudo actualizar el estado de la programacion.", 500);
  }

  return {
    ok: true,
    eventId: event.id,
    matchCount: matches.length
  };
}

async function findEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, event_date, fixture_status, seeding_mode, third_place, minimum_rest_minutes, fixture_compact_preview, schedule_config"
    )
    .eq("id", eventId)
    .maybeSingle<EventDrawRow>();

  if (error) {
    throw new AdminRouteError("No se pudo validar el campeonato.", 500);
  }

  if (!data) {
    throw new AdminRouteError("El campeonato seleccionado no existe.", 404);
  }

  return data;
}

async function findDrawableTeams(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  categoryId?: string,
  allowPaymentOverride = false
): Promise<Team[]> {
  let query = supabase
    .from("teams")
    .select("id, event_id, category_id, name, status, payment_status, created_at")
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (!allowPaymentOverride) {
    query = query.eq("payment_status", "approved");
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    throw new AdminRouteError("No se pudieron cargar los equipos inscritos.", 500);
  }

  return ((data ?? []) as TeamDrawRow[]).map((team) => ({
    id: team.id,
    eventId: team.event_id,
    categoryId: team.category_id ?? undefined,
    name: team.name,
    delegateName: "",
    delegatePhone: "",
    delegateEmail: "",
    paymentMethod: "yape",
    registrationCode: "",
    paymentStatus: team.payment_status === "verified" ? "approved" : team.payment_status,
    status: team.status,
    primaryColor: "#2f6f4e",
    secondaryColor: "#f8fafc",
    createdAt: team.created_at ?? undefined
  }));
}

async function findEventMatches(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string
) {
  const { data, error } = await supabase
    .from("matches")
    .select("id, status")
    .eq("event_id", eventId);

  if (error) {
    throw new AdminRouteError("No se pudieron revisar las llaves existentes.", 500);
  }

  return (data ?? []) as ExistingMatchRow[];
}

async function findAssignedVenues(supabase: ReturnType<typeof createSupabaseAdminClient>, eventId: string) {
  const { data, error } = await supabase
    .from("event_venues")
    .select("venues(id, name, active)")
    .eq("event_id", eventId);

  if (error) {
    throw new AdminRouteError("No se pudieron cargar las canchas asignadas.", 500);
  }

  return ((data ?? []) as Array<{ venues: VenueDrawRow | VenueDrawRow[] | null }>)
    .flatMap((row) => (Array.isArray(row.venues) ? row.venues : row.venues ? [row.venues] : []))
    .filter((venue) => venue.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function findActiveTimeSlotCount(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { count, error } = await supabase
    .from("time_slots")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if (error) {
    throw new AdminRouteError("No se pudieron validar los horarios disponibles.", 500);
  }

  return count ?? 0;
}

async function auditScheduleOverride(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: { eventId: string; allowPaymentOverride: boolean; overrideValidatedResults: boolean }
) {
  await supabase.from("audit_logs").insert({
    action: "regeneracion_programacion",
    entity_table: "events",
    entity_id: payload.eventId,
    payload
  });
}

function assignStableMatchIds(matches: ReturnType<typeof generateOneDaySchedule>["matches"], seed: string) {
  const idByGeneratedId = new Map(matches.map((match) => [match.id, stableUuid(`${seed}:${match.id}`)]));

  return matches.map((match) => ({
    ...match,
    id: idByGeneratedId.get(match.id) ?? stableUuid(`${seed}:${match.id}`),
    homeSourceMatchId: mapOptionalId(match.homeSourceMatchId, idByGeneratedId),
    awaySourceMatchId: mapOptionalId(match.awaySourceMatchId, idByGeneratedId),
    sourceMatchIds: match.sourceMatchIds?.map((id) => idByGeneratedId.get(id) ?? id),
    dependsOnMatchIds: match.dependsOnMatchIds?.map((id) => idByGeneratedId.get(id) ?? id),
    nextMatchId: undefined
  }));
}

function mapOptionalId(value: string | undefined, idByGeneratedId: Map<string, string>) {
  if (!value) return undefined;
  return idByGeneratedId.get(value) ?? value;
}

function stableUuid(value: string) {
  const hex = createHash("sha1").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const joined = hex.join("");

  return [
    joined.slice(0, 8),
    joined.slice(8, 12),
    joined.slice(12, 16),
    joined.slice(16, 20),
    joined.slice(20, 32)
  ].join("-");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
