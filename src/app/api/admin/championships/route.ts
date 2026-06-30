import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import type { PaymentMethod, SportKey, TournamentFormat } from "@/lib/types";

export const runtime = "nodejs";

const championshipSchema = z.object({
  eventId: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Ingresa el nombre del campeonato."),
  sport: z.enum(["futsal", "voley", "futbol"]),
  category: z.string().trim().min(1, "Ingresa la categoria o rama."),
  categories: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1, "Ingresa el nombre de la categoria."),
        slug: z.string().trim().optional(),
        description: z.string().trim().optional().default(""),
        published: z.boolean().default(true),
        active: z.boolean().default(true),
        sortOrder: z.number().int().min(1).default(1)
      })
    )
    .default([]),
  eventDate: z.string().trim().min(1, "Selecciona la fecha del evento."),
  status: z.enum(["draft", "registration", "in_progress", "finished"]),
  description: z.string().trim().optional(),
  format: z.enum(["league", "single_elimination", "groups_then_knockout"]),
  seedingMode: z.enum(["random", "registration_order", "manual", "ranking"]),
  maxTeams: z.number().int().min(2),
  thirdPlace: z.boolean(),
  allowByes: z.boolean(),
  penaltiesEnabled: z.boolean(),
  registrationFee: z.number().min(0),
  registrationOpenUntil: z.string().trim().min(1, "Selecciona el cierre de inscripcion."),
  minPlayers: z.number().int().min(1),
  maxPlayers: z.number().int().min(1),
  paymentMethods: z.array(z.enum(["yape", "plin"])).min(1, "Elige al menos un metodo de pago."),
  registrationCodeBatch: z.number().int().min(0),
  pointsWin: z.number().int().min(0),
  pointsDraw: z.number().int().min(0),
  pointsLoss: z.number().int().min(0),
  matchDurationMinutes: z.number().int().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  transitionMinutes: z.number().int().min(0),
  minimumRestMinutes: z.number().int().min(0),
  allowCompactPreview: z.boolean(),
  selectedCourts: z.array(z.string().trim().min(1)).min(1, "Selecciona al menos una cancha."),
  basesText: z.string().trim().optional()
}).refine((value) => value.maxPlayers >= value.minPlayers, {
  message: "El maximo de jugadores no puede ser menor al minimo.",
  path: ["maxPlayers"]
});

type ChampionshipInput = z.infer<typeof championshipSchema>;

type EventSaveRow = {
  id: string;
  slug: string;
};

type SportCatalogRow = {
  id: string;
  name: string;
};

type FormatCatalogRow = {
  id: string;
  key: string;
};

type RegistrationCodeRow = {
  code: string;
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

  const parsed = championshipSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Datos invalidos para publicar el campeonato.", 400);
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
    return jsonError("El servidor no tiene configurado Supabase para publicar campeonatos.", 500);
  }

  try {
    const result = await saveChampionship(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminRouteError) return jsonError(error.message, error.status);

    console.error("Unexpected admin championship save error", error);
    return jsonError("No se pudo publicar el campeonato. Intentalo otra vez.", 500);
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
    throw new AdminRouteError("Solo el administrador puede publicar campeonatos.", 403);
  }
}

async function saveChampionship(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: ChampionshipInput
) {
  const slug = await uniqueEventSlug(supabase, slugify(input.name), input.eventId);
  const categories = normalizeCategoryPayload(input);
  const primaryCategoryName = categories[0]?.name ?? input.category;
  const expandedResult = await saveExpandedEvent(supabase, input, slug, primaryCategoryName).catch((error: unknown) => {
    if (isMissingColumnOrTableError(error)) return null;
    throw error;
  });
  const event = expandedResult ?? await saveLegacyEvent(supabase, input, slug, primaryCategoryName);

  if (categories.length > 0) {
    await saveEventCategories(supabase, event.id, categories).catch((error: unknown) => {
      if (isMissingColumnOrTableError(error)) return;
      throw error;
    });
  }

  await ensureRegistrationCodes(supabase, {
    eventId: event.id,
    slug: event.slug,
    sport: input.sport,
    category: primaryCategoryName,
    amount: input.registrationFee,
    paymentMethods: input.paymentMethods,
    targetCount: input.registrationCodeBatch
  });
  await saveBasesIfPresent(supabase, input, event.slug).catch(() => null);

  return {
    ok: true,
    eventId: event.id,
    slug: event.slug
  };
}

async function saveExpandedEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: ChampionshipInput,
  slug: string,
  primaryCategoryName: string
) {
  const sportId = await findOrCreateSport(supabase, input.sport);
  const formatId = await findOrCreateFormat(supabase, input.format);
  const payload = {
    name: input.name,
    slug,
    sport_id: sportId,
    category: primaryCategoryName,
    format_id: formatId,
    status: input.status,
    registration_fee: input.registrationFee,
    registration_open_until: dateTimeLocalToIso(input.registrationOpenUntil),
    max_teams: input.maxTeams,
    min_players: input.minPlayers,
    max_players: input.maxPlayers,
    points_win: input.pointsWin,
    points_draw: input.pointsDraw,
    points_loss: input.pointsLoss,
    rules_summary: input.basesText || input.description || "",
    prevent_cross_sport_conflicts: true,
    minimum_rest_minutes: input.minimumRestMinutes,
    event_date: dateInputToIso(input.eventDate),
    fixture_status: "draft_auto",
    seeding_mode: input.seedingMode,
    third_place: input.thirdPlace,
    allow_byes: input.allowByes,
    penalties_enabled: input.penaltiesEnabled,
    fixture_compact_preview: input.allowCompactPreview,
    schedule_config: {
      startTime: input.startTime,
      matchDurationMinutes: input.matchDurationMinutes,
      transitionMinutes: input.transitionMinutes,
      courts: input.selectedCourts,
      minimumRestMinutes: input.minimumRestMinutes,
      allowCompactPreview: input.allowCompactPreview
    }
  };

  if (input.eventId) {
    const { data, error } = await supabase
      .from("events")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.eventId)
      .select("id, slug")
      .maybeSingle<EventSaveRow>();

    if (error) throw error;
    if (!data) throw new AdminRouteError("El campeonato seleccionado no existe.", 404);
    return data;
  }

  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id, slug")
    .single<EventSaveRow>();

  if (error) throw error;
  return data;
}

async function saveLegacyEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: ChampionshipInput,
  slug: string,
  primaryCategoryName: string
) {
  const payload = {
    name: input.name,
    slug,
    sport: input.sport,
    category: primaryCategoryName,
    format: input.format,
    status: input.status,
    registration_fee: input.registrationFee,
    registration_open_until: dateTimeLocalToIso(input.registrationOpenUntil),
    max_teams: input.maxTeams,
    min_players: input.minPlayers,
    max_players: input.maxPlayers,
    points_win: input.pointsWin,
    points_draw: input.pointsDraw,
    points_loss: input.pointsLoss,
    rules_summary: input.basesText || input.description || ""
  };

  if (input.eventId) {
    const { data, error } = await supabase
      .from("events")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.eventId)
      .select("id, slug")
      .maybeSingle<EventSaveRow>();

    if (error) throw new AdminRouteError("No se pudo actualizar el campeonato.", 500);
    if (!data) throw new AdminRouteError("El campeonato seleccionado no existe.", 404);
    return data;
  }

  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id, slug")
    .single<EventSaveRow>();

  if (error) throw new AdminRouteError("No se pudo crear el campeonato.", 500);
  return data;
}

type CategorySaveRow = {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  description: string | null;
  published: boolean;
  active: boolean;
  sort_order: number;
};

function normalizeCategoryPayload(input: ChampionshipInput) {
  if (input.categories.length > 0) {
    return input.categories.map((category, index) => ({
      id: category.id,
      name: category.name,
      slug: category.slug || slugify(category.name),
      description: category.description || "",
      published: category.published,
      active: category.active,
      sortOrder: category.sortOrder || index + 1
    }));
  }

  if (input.eventId) {
    return [];
  }

  return [
    {
      name: input.category,
      slug: slugify(input.category),
      description: "",
      published: true,
      active: true,
      sortOrder: 1
    }
  ];
}

async function saveEventCategories(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  categories: Array<{
    id?: string;
    name: string;
    slug: string;
    description: string;
    published: boolean;
    active: boolean;
    sortOrder: number;
  }>
) {
  const { data: existing, error } = await supabase
    .from("event_categories")
    .select("id, event_id, name, slug, description, published, active, sort_order")
    .eq("event_id", eventId);

  if (error) throw error;

  const existingRows = (existing ?? []) as CategorySaveRow[];
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const nextIds = new Set<string>();
  const now = new Date().toISOString();

  for (const category of categories) {
    const payload = {
      event_id: eventId,
      name: category.name,
      slug: category.slug,
      description: category.description || null,
      published: category.published,
      active: category.active,
      sort_order: category.sortOrder,
      updated_at: now
    };

    if (category.id && existingById.has(category.id)) {
      const { error: updateError } = await supabase.from("event_categories").update(payload).eq("id", category.id);
      if (updateError) throw updateError;
      nextIds.add(category.id);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("event_categories")
      .insert(payload)
      .select("id")
      .single<{ id: string }>();

    if (insertError) throw insertError;
    nextIds.add(inserted.id);
  }

  const removedCategories = existingRows.filter((row) => !nextIds.has(row.id));
  for (const category of removedCategories) {
    const { data: linkedTeams, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("category_id", category.id)
      .limit(1);

    if (teamError) throw teamError;
    if ((linkedTeams ?? []).length > 0) {
      throw new AdminRouteError(
        `No se puede eliminar la categoria ${category.name} porque ya tiene equipos inscritos.`,
        409
      );
    }

    const { data: linkedMatches, error: matchError } = await supabase
      .from("matches")
      .select("id")
      .eq("category_id", category.id)
      .limit(1);

    if (matchError) throw matchError;
    if ((linkedMatches ?? []).length > 0) {
      throw new AdminRouteError(
        `No se puede eliminar la categoria ${category.name} porque ya tiene partidos asociados.`,
        409
      );
    }

    const { error: deleteError } = await supabase.from("event_categories").delete().eq("id", category.id);
    if (deleteError) throw deleteError;
  }
}

async function findOrCreateSport(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sport: SportKey
) {
  const { data, error } = await supabase.from("sports").select("id, name");
  if (error) throw error;

  const existing = ((data ?? []) as SportCatalogRow[]).find((row) => normalizeText(row.name) === sportCatalogName(sport));
  if (existing) return existing.id;

  const defaults = {
    futsal: { name: "Futsal", players_per_team: 5, match_duration: 40 },
    voley: { name: "Voley", players_per_team: 6, match_duration: 40 },
    futbol: { name: "Futbol 11", players_per_team: 11, match_duration: 90 }
  } satisfies Record<SportKey, { name: string; players_per_team: number; match_duration: number }>;

  const { data: inserted, error: insertError } = await supabase
    .from("sports")
    .insert(defaults[sport])
    .select("id")
    .single<{ id: string }>();

  if (insertError) throw insertError;
  return inserted.id;
}

async function findOrCreateFormat(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  format: TournamentFormat
) {
  const { data, error } = await supabase.from("competition_formats").select("id, key");
  if (error) throw error;

  const existing = ((data ?? []) as FormatCatalogRow[]).find((row) => row.key === format);
  if (existing) return existing.id;

  const defaults = {
    league: { name: "Liga por puntos", key: "league", description: "Todos contra todos por puntos." },
    single_elimination: { name: "Eliminacion directa", key: "single_elimination", description: "Llaves directas." },
    groups_then_knockout: { name: "Grupos + eliminacion", key: "groups_then_knockout", description: "Grupos y fase final." }
  } satisfies Record<TournamentFormat, { name: string; key: TournamentFormat; description: string }>;
  const formatRow: { name: string; key: string; description: string } = defaults[format];

  const { data: inserted, error: insertError } = await supabase
    .from("competition_formats")
    .insert(formatRow)
    .select("id")
    .single<{ id: string }>();

  if (insertError) throw insertError;
  return inserted.id;
}

async function ensureRegistrationCodes(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    eventId,
    slug,
    sport,
    category,
    amount,
    paymentMethods,
    targetCount
  }: {
    eventId: string;
    slug: string;
    sport: SportKey;
    category: string;
    amount: number;
    paymentMethods: PaymentMethod[];
    targetCount: number;
  }
) {
  if (targetCount <= 0 || paymentMethods.length === 0) return;

  const { data, error } = await supabase
    .from("registration_codes")
    .select("code")
    .eq("event_id", eventId);

  if (error) throw new AdminRouteError("Se creo el campeonato, pero no se pudieron revisar los codigos.", 500);

  const existingCodes = new Set(((data ?? []) as RegistrationCodeRow[]).map((row) => row.code));
  const desiredRows = Array.from({ length: targetCount }, (_, index) => {
    const code = `${registrationCodePrefix(sport, category, slug)}-${String(index + 1).padStart(3, "0")}`;
    return {
      event_id: eventId,
      method: paymentMethods[index % paymentMethods.length],
      code,
      amount,
      status: "available"
    };
  }).filter((row) => !existingCodes.has(row.code));

  if (desiredRows.length === 0) return;

  const { error: insertError } = await supabase.from("registration_codes").insert(desiredRows);
  if (insertError) {
    throw new AdminRouteError("Se creo el campeonato, pero no se pudieron generar los codigos de inscripcion.", 500);
  }
}

async function saveBasesIfPresent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: ChampionshipInput,
  slug: string
) {
  if (!input.basesText?.trim()) return;

  const startDate = dateInputToIso(input.eventDate);
  const payload = {
    championship_name: input.name,
    year: new Date(startDate).getFullYear(),
    organizer: "Administracion",
    start_date: startDate,
    end_date: startDate,
    description: input.basesText,
    match_duration: input.matchDurationMinutes,
    points_win: input.pointsWin,
    points_draw: input.pointsDraw,
    points_loss: input.pointsLoss,
    tiebreaker_rules: "Segun bases del campeonato.",
    walkover_rules: "W.O. segun tiempo configurado por administracion.",
    max_players_per_team: input.maxPlayers,
    sanctions: "Sanciones segun reglamento interno.",
    published: true
  };

  const { data: existing } = await supabase
    .from("tournament_bases")
    .select("id")
    .eq("championship_name", input.name)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    await supabase
      .from("tournament_bases")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("tournament_bases").insert({
    id: stableUuid(`bases:${slug}`),
    ...payload
  });
}

async function uniqueEventSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  baseSlug: string,
  currentEventId?: string
) {
  const cleanBase = baseSlug || "campeonato";

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? cleanBase : `${cleanBase}-${index + 1}`;
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle<{ id: string }>();

    if (error) throw new AdminRouteError("No se pudo validar el enlace publico del campeonato.", 500);
    if (!data || data.id === currentEventId) return candidate;
  }

  throw new AdminRouteError("No se pudo generar un enlace publico unico.", 409);
}

function sportCatalogName(sport: SportKey) {
  if (sport === "futbol") return "futbol 11";
  if (sport === "voley") return "voley";
  return "futsal";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function registrationCodePrefix(sport: SportKey, category: string, slug: string) {
  const sportPrefix = sport === "futbol" ? "F11" : sport === "voley" ? "VOL" : "FUT";
  const categoryPrefix = slugify(category).slice(0, 3).toUpperCase() || "GEN";
  const slugPrefix = slugify(slug).slice(0, 3).toUpperCase() || "CMP";

  return `${sportPrefix}-${categoryPrefix || slugPrefix}`;
}

function dateInputToIso(value: string) {
  return new Date(`${value}T12:00:00-05:00`).toISOString();
}

function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}

function isMissingColumnOrTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "PGRST204" ||
    maybeError.code === "42P01" ||
    maybeError.code === "42703" ||
    /column|schema cache|relation|table/i.test(maybeError.message ?? "")
  );
}

function stableUuid(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const hex = Math.abs(hash).toString(16).padStart(8, "0").repeat(4).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
