import { NextResponse } from "next/server";
import { z } from "zod";
import type { SeedingMode, SportKey, TournamentFormat } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-server";

const payloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3),
  sport: z.enum(["futsal", "voley", "futbol"]),
  category: z.string().trim().min(2),
  eventDate: z.string().trim().min(1),
  status: z.enum(["draft", "registration", "in_progress", "finished"]),
  registrationFee: z.coerce.number().min(0),
  registrationOpenUntil: z.string().trim().min(1),
  rulesSummary: z.string().trim().default(""),
  format: z.enum(["league", "single_elimination", "groups_then_knockout"]),
  maxTeams: z.coerce.number().int().min(2).max(64),
  minPlayers: z.coerce.number().int().min(1).max(99),
  maxPlayers: z.coerce.number().int().min(1).max(99),
  seedingMode: z.enum(["random", "registration_order", "manual", "ranking"]),
  thirdPlace: z.boolean(),
  allowByes: z.boolean(),
  penaltiesEnabled: z.boolean(),
  matchDuration: z.coerce.number().int().min(5).max(240),
  halfTimeMinute: z.coerce.number().int().min(1).max(239),
  halfTimeBreakMinutes: z.coerce.number().int().min(0).max(60),
  additionalTimeAllowedMinutes: z.coerce.number().int().min(0).max(60),
  matchStartToleranceMinutes: z.coerce.number().int().min(0).max(120),
  allowManualFinish: z.boolean(),
  walkoverMinutes: z.coerce.number().int().min(0).max(60),
  pointsWin: z.coerce.number().int(),
  pointsDraw: z.coerce.number().int(),
  pointsLoss: z.coerce.number().int(),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  courtCount: z.coerce.number().int().min(1).max(3),
  courts: z.array(z.string().trim().min(1)).min(1).max(3),
  fixtureCompactPreview: z.boolean(),
  publicLiveScores: z.boolean(),
  transitionMinutes: z.coerce.number().int().min(0).max(60),
  estimatedEndTime: z.string().trim().regex(/^\d{2}:\d{2}$/)
}).superRefine((input, context) => {
  if (input.halfTimeMinute >= input.matchDuration) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["halfTimeMinute"],
      message: "El medio tiempo debe ser menor que la duracion del partido."
    });
  }
});

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type EventForDeletion = {
  id: string;
  name: string;
  event_date: string | null;
};

export async function POST(request: Request) {
  try {
    const input = payloadSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);
    const id = input.id ?? crypto.randomUUID();
    const [sportId, formatId, previousEvent] = await Promise.all([
      upsertSport(admin, input.sport, input.matchDuration),
      upsertFormat(admin, input.format),
      input.id ? getEventName(admin, input.id) : Promise.resolve(null)
    ]);
    const normalized = normalizeCompetitionInput(input);
    const slug = `${slugify(input.name)}-${id.slice(0, 8)}`;
    const eventDateIso = dateOnlyToIso(input.eventDate);
    const registrationOpenUntilIso = localDateTimeToIso(input.registrationOpenUntil);
    const scheduleConfig = {
      startTime: input.startTime,
      matchDurationMinutes: input.matchDuration,
      halfTimeMinute: input.halfTimeMinute,
      halfTimeBreakMinutes: input.halfTimeBreakMinutes,
      additionalTimeAllowedMinutes: input.additionalTimeAllowedMinutes,
      matchStartToleranceMinutes: input.matchStartToleranceMinutes,
      allowManualFinish: input.allowManualFinish,
      transitionMinutes: input.transitionMinutes,
      courts: input.courts,
      courtCount: input.courtCount,
      minimumRestMinutes: input.matchDuration + input.transitionMinutes,
      allowCompactPreview: input.fixtureCompactPreview,
      estimatedEndTime: input.estimatedEndTime
    };

    const { error } = await admin.from("events").upsert(
      {
        id,
        name: input.name,
        slug,
        sport_id: sportId,
        category: input.category,
        format_id: formatId,
        status: input.status,
        registration_fee: input.registrationFee,
        registration_open_until: registrationOpenUntilIso,
        max_teams: input.maxTeams,
        min_players: input.minPlayers,
        max_players: Math.max(input.minPlayers, input.maxPlayers),
        points_win: normalized.pointsWin,
        points_draw: normalized.pointsDraw,
        points_loss: normalized.pointsLoss,
        rules_summary: input.rulesSummary || defaultRulesSummary(input.format),
        prevent_cross_sport_conflicts: true,
        minimum_rest_minutes: input.matchDuration + input.transitionMinutes,
        event_date: eventDateIso,
        fixture_status: "draft_auto",
        seeding_mode: normalized.seedingMode,
        third_place: normalized.thirdPlace,
        allow_byes: normalized.allowByes,
        penalties_enabled: normalized.penaltiesEnabled,
        fixture_compact_preview: input.fixtureCompactPreview,
        public_live_scores: input.publicLiveScores,
        schedule_config: scheduleConfig,
        created_by: user.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await Promise.all([
      upsertBases(admin, {
        previousName: previousEvent?.name,
        championshipName: input.name,
        eventDateIso,
        description: input.rulesSummary || defaultRulesSummary(input.format),
        matchDuration: input.matchDuration,
        pointsWin: normalized.pointsWin,
        pointsDraw: normalized.pointsDraw,
        pointsLoss: normalized.pointsLoss,
        maxPlayers: Math.max(input.minPlayers, input.maxPlayers),
        published: input.status !== "draft"
      }),
      upsertVenues(admin, input.courts, sportId)
    ]);

    return NextResponse.json({ id, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el campeonato.";
    const status = message === "No autorizado" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = getChampionshipId(request);
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const { data: event, error: lookupError } = await admin
      .from("events")
      .select("id, name, event_date")
      .eq("id", id)
      .maybeSingle<EventForDeletion>();

    if (lookupError) throw new Error(lookupError.message);
    if (!event) throw new Error("Campeonato no encontrado.");

    const matchesResponse = await admin.from("matches").delete().eq("event_id", id);
    if (matchesResponse.error) throw new Error(matchesResponse.error.message);

    const eventResponse = await admin.from("events").delete().eq("id", id);
    if (eventResponse.error) throw new Error(eventResponse.error.message);

    await deleteBasesForEvent(admin, event);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar el campeonato.";
    const status = message === "No autorizado" ? 401 : message === "Campeonato no encontrado." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

async function requireAdminUser(admin: AdminClient) {
  const authClient = await createSupabaseRouteClient();
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user?.email) {
    throw new Error("No autorizado");
  }

  const [profileResponse, adminEmailResponse] = await Promise.all([
    admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle<{ role: string }>(),
    admin
      .from("admin_emails")
      .select("email")
      .eq("email", data.user.email.trim().toLowerCase())
      .eq("active", true)
      .maybeSingle<{ email: string }>()
  ]);

  if (profileResponse.error) throw new Error(profileResponse.error.message);
  if (adminEmailResponse.error) throw new Error(adminEmailResponse.error.message);

  if (profileResponse.data?.role === "admin" || adminEmailResponse.data) {
    return data.user;
  }

  throw new Error("No autorizado");
}

function getChampionshipId(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const parsed = z.string().uuid().safeParse(id);

  if (!parsed.success) {
    throw new Error("Selecciona un campeonato valido.");
  }

  return parsed.data;
}

async function upsertSport(admin: AdminClient, sport: SportKey, matchDuration: number) {
  const metadata: Record<SportKey, { name: string; players: number }> = {
    futsal: { name: "Futsal", players: 5 },
    voley: { name: "Vóley", players: 6 },
    futbol: { name: "Fútbol 11", players: 11 }
  };
  const current = metadata[sport];
  const { data, error } = await admin
    .from("sports")
    .upsert(
      {
        name: current.name,
        players_per_team: current.players,
        match_duration: matchDuration,
        active: true
      },
      { onConflict: "name" }
    )
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

async function upsertFormat(admin: AdminClient, format: TournamentFormat) {
  const metadata: Record<TournamentFormat, { name: string; description: string }> = {
    league: {
      name: "Liga (Todos contra todos)",
      description: "Sistema round robin por puntos."
    },
    single_elimination: {
      name: "Eliminacion Directa",
      description: "Llaves sin empates; definicion por penales o criterio manual."
    },
    groups_then_knockout: {
      name: "Grupos + Eliminacion",
      description: "Fase inicial por grupos y cierre por eliminacion."
    }
  };
  const current = metadata[format];
  const { data, error } = await admin
    .from("competition_formats")
    .upsert(
      {
        key: format,
        name: current.name,
        description: current.description,
        active: true
      },
      { onConflict: "key" }
    )
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

async function getEventName(admin: AdminClient, id: string) {
  const { data, error } = await admin.from("events").select("name").eq("id", id).maybeSingle<{ name: string }>();
  if (error) throw new Error(error.message);
  return data;
}

function normalizeCompetitionInput(input: z.infer<typeof payloadSchema>) {
  if (input.format === "single_elimination") {
    return {
      pointsWin: 0,
      pointsDraw: 0,
      pointsLoss: 0,
      thirdPlace: input.thirdPlace,
      allowByes: input.allowByes,
      penaltiesEnabled: input.penaltiesEnabled,
      seedingMode: input.seedingMode
    };
  }

  if (input.format === "league") {
    return {
      pointsWin: input.pointsWin,
      pointsDraw: input.pointsDraw,
      pointsLoss: input.pointsLoss,
      thirdPlace: false,
      allowByes: false,
      penaltiesEnabled: false,
      seedingMode: "registration_order" as SeedingMode
    };
  }

  return {
    pointsWin: input.pointsWin,
    pointsDraw: input.pointsDraw,
    pointsLoss: input.pointsLoss,
    thirdPlace: input.thirdPlace,
    allowByes: input.allowByes,
    penaltiesEnabled: false,
    seedingMode: input.seedingMode
  };
}

async function deleteBasesForEvent(admin: AdminClient, event: EventForDeletion) {
  let query = admin.from("tournament_bases").delete().eq("championship_name", event.name);

  if (event.event_date) {
    query = query.eq("start_date", event.event_date);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function upsertBases(
  admin: AdminClient,
  {
    previousName,
    championshipName,
    eventDateIso,
    description,
    matchDuration,
    pointsWin,
    pointsDraw,
    pointsLoss,
    maxPlayers,
    published
  }: {
    previousName?: string;
    championshipName: string;
    eventDateIso: string;
    description: string;
    matchDuration: number;
    pointsWin: number;
    pointsDraw: number;
    pointsLoss: number;
    maxPlayers: number;
    published: boolean;
  }
) {
  const baseRow = {
    championship_name: championshipName,
    year: new Date(eventDateIso).getFullYear(),
    organizer: "Comision deportiva universitaria",
    start_date: eventDateIso,
    end_date: eventDateIso,
    description,
    match_duration: matchDuration,
    points_win: pointsWin,
    points_draw: pointsDraw,
    points_loss: pointsLoss,
    tiebreaker_rules: pointsDraw === 0 ? "Empate en llave se define por penales o decision oficial." : "Puntos, diferencia de goles, goles a favor y partido directo.",
    walkover_rules: "Tolerancia de 10 minutos. Ausencia del equipo implica W.O.",
    max_players_per_team: maxPlayers,
    sanctions: "Tarjeta roja directa suspende al jugador para el siguiente partido.",
    published,
    updated_at: new Date().toISOString()
  };
  const lookupName = previousName ?? championshipName;
  const { data: existing, error: lookupError } = await admin
    .from("tournament_bases")
    .select("id")
    .eq("championship_name", lookupName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (lookupError) throw new Error(lookupError.message);

  const response = existing
    ? await admin.from("tournament_bases").update(baseRow).eq("id", existing.id)
    : await admin.from("tournament_bases").insert(baseRow);

  if (response.error) throw new Error(response.error.message);
}

async function upsertVenues(admin: AdminClient, courts: string[], sportId: string) {
  for (const court of courts) {
    const { data, error } = await admin
      .from("venues")
      .upsert(
        {
          name: court,
          location: "Sede principal",
          active: true
        },
        { onConflict: "name" }
      )
      .select("id")
      .single<{ id: string }>();

    if (error) throw new Error(error.message);

    const linkResponse = await admin
      .from("venue_sports")
      .upsert({ venue_id: data.id, sport_id: sportId });

    if (linkResponse.error) throw new Error(linkResponse.error.message);
  }
}

function dateOnlyToIso(value: string) {
  return `${value.slice(0, 10)}T00:00:00-05:00`;
}

function localDateTimeToIso(value: string) {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value).toISOString();
  return new Date(`${value}:00-05:00`).toISOString();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "campeonato";
}

function defaultRulesSummary(format: TournamentFormat) {
  if (format === "single_elimination") return "Eliminacion directa sin empates en tabla.";
  if (format === "groups_then_knockout") return "Fase de grupos por puntos y eliminacion para clasificados.";
  return "Liga por puntos todos contra todos.";
}
