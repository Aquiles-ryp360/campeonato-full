import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateKnockoutMatches } from "../src/lib/domain/bracket-generator";
import { generateOneDaySchedule } from "../src/lib/domain/schedule-generator";
import type { Match, Team } from "../src/lib/types";

loadEnvFile(".env");
loadEnvFile(".env.local");

const eventId = "77777777-7777-4777-8777-777777777712";
const eventSlug = "capacitacion-arbitros-12-equipos";
const eventName = "Capacitacion Arbitros - 12 Equipos";
const courts = ["Cancha Capacitacion A", "Cancha Capacitacion B"];
const today = limaDateString();
const eventDate = `${today}T08:00:00-05:00`;
const registrationClosedAt = `${today}T07:30:00-05:00`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const teamSeedData = [
  ["01", "Mecanica Electrica Training", "Carlos Rivas", "#0f766e"],
  ["02", "Sistemas Training", "Valeria Torres", "#2563eb"],
  ["03", "Civil Training", "Miguel Salas", "#16a34a"],
  ["04", "Minas Training", "Rosa Quispe", "#7c3aed"],
  ["05", "Arquitectura Training", "Diego Paredes", "#be123c"],
  ["06", "Agronomia Training", "Patricia Leon", "#65a30d"],
  ["07", "Educacion Fisica Training", "Jorge Mamani", "#ea580c"],
  ["08", "Derecho Training", "Lucia Ramos", "#334155"],
  ["09", "Enfermeria Training", "Andrea Flores", "#0891b2"],
  ["10", "Contabilidad Training", "Fernando Campos", "#ca8a04"],
  ["11", "Industrial Training", "Sofia Vargas", "#c026d3"],
  ["12", "Medicina Training", "Luis Cardenas", "#059669"]
] as const;

const firstNames = [
  "Adrian",
  "Bruno",
  "Cesar",
  "Daniel",
  "Esteban",
  "Fabio",
  "Gian",
  "Hector",
  "Ivan",
  "Jair",
  "Kevin",
  "Luis",
  "Mateo",
  "Nicolas"
];

const lastNames = [
  "Apaza",
  "Benavides",
  "Castillo",
  "Delgado",
  "Espinoza",
  "Fernandez",
  "Guzman",
  "Huaman",
  "Ibarra",
  "Jimenez",
  "Lopez",
  "Mamani",
  "Quispe",
  "Ramos"
];

const positions = [
  "Arquero",
  "Lateral derecho",
  "Defensa central",
  "Defensa central",
  "Lateral izquierdo",
  "Volante mixto",
  "Volante defensivo",
  "Volante ofensivo",
  "Extremo derecho",
  "Delantero",
  "Extremo izquierdo",
  "Suplente defensa",
  "Suplente medio",
  "Suplente ataque"
];

type AdminClient = SupabaseClient;

async function main() {
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await assertTrainingSchemaReady(supabase);

  const refereeEmails = await resolveRefereeEmails(supabase);
  const sportId = await upsertFootballSport(supabase);
  const formatId = await upsertKnockoutFormat(supabase);
  const venueByCourt = await upsertVenues(supabase, sportId);

  await resetTrainingEvent(supabase);
  await seedEvent(supabase, sportId, formatId);
  await seedBases(supabase);

  const teams = buildTeams();
  await seedRegistrationCodes(supabase, teams);
  await seedTeams(supabase, teams);
  await markRegistrationCodesUsed(supabase, teams);
  await seedPlayers(supabase, teams);

  const matches = buildScheduledMatches(teams);
  await seedMatches(supabase, matches, venueByCourt);
  await seedRefereeAssignments(supabase, matches, refereeEmails);
  await validateSeed(supabase);

  console.log("Campeonato de capacitacion generado en Supabase.");
  console.log(`Campeonato: ${eventName}`);
  console.log(`Slug publico: /c/${eventSlug}`);
  console.log(`Equipos: ${teams.length}`);
  console.log(`Jugadores: ${teams.length * 14}`);
  console.log(`Partidos de llave: ${matches.length}`);
  console.log(`Partidos asignados a arbitros: ${matches.length}`);
  console.log(`Correos arbitro: ${refereeEmails.join(", ")}`);
}

async function assertTrainingSchemaReady(supabase: AdminClient) {
  const [eventsCheck, teamsCheck, playersCheck, matchesCheck, assignmentsCheck] = await Promise.all([
    supabase
      .from("events")
      .select("sport_id,format_id,event_date,fixture_status,seeding_mode,third_place,allow_byes,penalties_enabled,public_live_scores,fixture_compact_preview,schedule_config")
      .limit(1),
    supabase
      .from("teams")
      .select("academic_career,payment_validated_at,approved_at")
      .limit(1),
    supabase
      .from("players")
      .select("jersey_number,position,document_type,identity_source,verification_status")
      .limit(1),
    supabase
      .from("matches")
      .select("stage,label,home_placeholder,away_placeholder,next_match_id,is_home_next,source_match_ids,depends_on_match_ids,scheduled_end_at,fixture_status,is_fixture_preliminary,live_status,win_method")
      .limit(1),
    supabase
      .from("referee_assignments")
      .select("match_id,referee_email,referee_name,active")
      .limit(1)
  ]);

  const errors = [
    eventsCheck.error?.message,
    teamsCheck.error?.message,
    playersCheck.error?.message,
    matchesCheck.error?.message,
    assignmentsCheck.error?.message
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(
      [
        "La base no tiene todas las migraciones necesarias para el seed de capacitacion.",
        ...errors.map((message) => `- ${message}`)
      ].join("\n")
    );
  }
}

async function resetTrainingEvent(supabase: AdminClient) {
  await requireOk(
    supabase.from("tournament_bases").delete().eq("championship_name", eventName),
    "limpiar bases de capacitacion"
  );

  await requireOk(
    supabase.from("events").delete().or(`id.eq.${eventId},slug.eq.${eventSlug}`),
    "limpiar campeonato de capacitacion previo"
  );
}

async function upsertFootballSport(supabase: AdminClient) {
  const existing = await supabase
    .from("sports")
    .select("id")
    .ilike("name", "F%tbol 11")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.id) return existing.data.id;

  const { data, error } = await supabase
    .from("sports")
    .upsert(
      {
        name: "Futbol 11",
        players_per_team: 11,
        match_duration: 30,
        active: true
      },
      { onConflict: "name" }
    )
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

async function upsertKnockoutFormat(supabase: AdminClient) {
  const { data, error } = await supabase
    .from("competition_formats")
    .upsert(
      {
        name: "Eliminacion Directa",
        key: "single_elimination",
        description: "Llaves de practica con avance automatico de ganadores.",
        active: true
      },
      { onConflict: "key" }
    )
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

async function upsertVenues(supabase: AdminClient, sportId: string) {
  const venueByCourt = new Map<string, string>();

  for (const court of courts) {
    const { data, error } = await supabase
      .from("venues")
      .upsert(
        {
          name: court,
          location: "Sede de capacitacion arbitral",
          active: true
        },
        { onConflict: "name" }
      )
      .select("id")
      .single<{ id: string }>();

    if (error) throw new Error(error.message);

    venueByCourt.set(court, data.id);
    await requireOk(
      supabase.from("venue_sports").upsert({ venue_id: data.id, sport_id: sportId }),
      `vincular ${court} con Futbol 11`
    );
  }

  return venueByCourt;
}

async function seedEvent(supabase: AdminClient, sportId: string, formatId: string) {
  await requireOk(
    supabase.from("events").insert({
      id: eventId,
      name: eventName,
      slug: eventSlug,
      sport_id: sportId,
      category: "Capacitacion arbitral",
      format_id: formatId,
      status: "in_progress",
      registration_fee: 0,
      registration_open_until: registrationClosedAt,
      max_teams: 12,
      min_players: 11,
      max_players: 14,
      points_win: 0,
      points_draw: 0,
      points_loss: 0,
      rules_summary: "Campeonato de prueba para capacitar arbitros: inicio de partido, goles, tarjetas, segundo tiempo, penales y envio de resultado.",
      organizer_name: "Comision deportiva de capacitacion",
      career_name: "Capacitacion arbitral",
      career_logo_url: "/epime-09/logo-carrera.png",
      theme_primary_color: "#28398f",
      theme_secondary_color: "#f4e84a",
      prevent_cross_sport_conflicts: true,
      minimum_rest_minutes: 30,
      event_date: eventDate,
      fixture_status: "published",
      seeding_mode: "random",
      third_place: true,
      allow_byes: true,
      penalties_enabled: true,
      public_live_scores: true,
      fixture_compact_preview: true,
      schedule_config: {
        startTime: "08:00",
        matchDurationMinutes: 30,
        halfTimeMinute: 15,
        halfTimeBreakMinutes: 5,
        additionalTimeAllowedMinutes: 0,
        matchStartToleranceMinutes: 1440,
        allowManualFinish: true,
        transitionMinutes: 5,
        courts,
        courtCount: courts.length,
        minimumRestMinutes: 30,
        allowCompactPreview: true,
        estimatedEndTime: "13:00",
        branding: {
          organizerName: "Comision deportiva de capacitacion",
          careerName: "Capacitacion arbitral",
          careerLogoUrl: "/epime-09/logo-carrera.png",
          themePrimaryColor: "#28398f",
          themeSecondaryColor: "#f4e84a"
        }
      }
    }),
    "campeonato de capacitacion"
  );
}

async function seedBases(supabase: AdminClient) {
  await requireOk(
    supabase.from("tournament_bases").insert({
      championship_name: eventName,
      year: Number(today.slice(0, 4)),
      organizer: "Comision deportiva de capacitacion",
      start_date: eventDate,
      end_date: eventDate,
      description: "Bases de prueba para que los arbitros practiquen el flujo completo de partido en vivo.",
      match_duration: 30,
      points_win: 0,
      points_draw: 0,
      points_loss: 0,
      tiebreaker_rules: "En empate de llave, practicar definicion por penales.",
      walkover_rules: "Sin W.O. real: capacitacion controlada por administracion.",
      max_players_per_team: 14,
      sanctions: "Tarjeta roja genera practica de suspension automatica.",
      published: true
    }),
    "bases de capacitacion"
  );
}

function buildTeams(): Team[] {
  return teamSeedData.map(([suffix, name, delegateName, color], index) => ({
    id: teamId(suffix),
    eventId,
    name,
    delegateName,
    delegatePhone: `999 200 ${suffix.padStart(3, "0")}`,
    delegateEmail: `delegado.capacitacion${suffix}@campeonato.local`,
    academicCareer: name.replace(" Training", ""),
    paymentMethod: index % 2 === 0 ? "yape" : "plin",
    registrationCode: `ARB-TRAIN-${suffix}`,
    paymentStatus: "verified",
    status: "approved",
    primaryColor: color,
    secondaryColor: "#f8fafc",
    createdAt: `${today}T07:${String(index).padStart(2, "0")}:00-05:00`
  }));
}

async function seedRegistrationCodes(supabase: AdminClient, teams: Team[]) {
  const rows = teams.map((team, index) => ({
    id: registrationCodeId(index + 1),
    event_id: eventId,
    code: team.registrationCode,
    method: team.paymentMethod,
    amount: 0,
    status: "available"
  }));

  await requireOk(supabase.from("registration_codes").insert(rows), "codigos de capacitacion");
}

async function seedTeams(supabase: AdminClient, teams: Team[]) {
  const now = new Date().toISOString();
  const rows = teams.map((team, index) => ({
    id: team.id,
    event_id: eventId,
    name: team.name,
    delegate_name: team.delegateName,
    delegate_phone: team.delegatePhone,
    delegate_email: team.delegateEmail,
    academic_career: team.academicCareer,
    registration_code_id: registrationCodeId(index + 1),
    primary_color: team.primaryColor,
    secondary_color: team.secondaryColor,
    status: "approved",
    payment_validated_at: now,
    approved_at: now,
    created_at: team.createdAt,
    updated_at: now
  }));

  await requireOk(supabase.from("teams").insert(rows), "equipos de capacitacion");
}

async function markRegistrationCodesUsed(supabase: AdminClient, teams: Team[]) {
  for (const [index, team] of teams.entries()) {
    await requireOk(
      supabase
        .from("registration_codes")
        .update({
          status: "used",
          used_by_team_id: team.id
        })
        .eq("id", registrationCodeId(index + 1)),
      `codigo usado ${team.registrationCode}`
    );
  }
}

async function seedPlayers(supabase: AdminClient, teams: Team[]) {
  const rows = teams.flatMap((team, teamIndex) =>
    Array.from({ length: 14 }, (_, playerIndex) => {
      const number = playerIndex + 1;
      return {
        id: playerId(teamIndex + 1, number),
        team_id: team.id,
        first_name: firstNames[playerIndex],
        last_name: lastNames[(teamIndex + playerIndex) % lastNames.length],
        dni: String(85000000 + (teamIndex + 1) * 100 + number),
        student_code: `2026${String(teamIndex + 1).padStart(2, "0")}${String(number).padStart(2, "0")}`,
        codigo_carrera: "CAP-ARB",
        escuela: "Capacitacion arbitral",
        enrollment_file: `capacitacion/${team.id}/jugador-${number}.pdf`,
        semester: `${Math.min(10, Math.max(1, number - 3))} ciclo`,
        lineup_role: number <= 11 ? "starter" : "substitute",
        document_type: "MANUAL",
        identity_source: "manual",
        verification_status: "confirmed",
        jersey_number: number,
        jersey_number_change_count: 0,
        position: positions[playerIndex]
      };
    })
  );

  await requireOk(supabase.from("players").insert(rows), "jugadores de capacitacion");
}

function buildScheduledMatches(teams: Team[]) {
  const generated = generateKnockoutMatches(teams, {
    eventId,
    format: "single_elimination",
    maxTeams: 12,
    thirdPlace: true,
    allowByes: true,
    seedingMode: "random",
    randomSeed: `${eventId}:${today}:capacitacion-arbitros`,
    fixtureStatus: "published"
  });
  const generatedIdToUuid = new Map(generated.map((match, index) => [match.id, matchId(index + 1)]));
  const schedule = generateOneDaySchedule(generated, {
    eventDate,
    startTime: "08:00",
    matchDurationMinutes: 30,
    transitionMinutes: 5,
    courts,
    minimumRestMinutes: 30,
    respectRoundDependencies: true,
    allowCompactPreview: true
  });

  return schedule.matches.map((match) => ({
    ...match,
    id: generatedIdToUuid.get(match.id) ?? match.id,
    nextMatchId: match.nextMatchId ? generatedIdToUuid.get(match.nextMatchId) : undefined,
    homeSourceMatchId: match.homeSourceMatchId ? generatedIdToUuid.get(match.homeSourceMatchId) : undefined,
    awaySourceMatchId: match.awaySourceMatchId ? generatedIdToUuid.get(match.awaySourceMatchId) : undefined,
    sourceMatchIds: match.sourceMatchIds?.map((sourceId) => generatedIdToUuid.get(sourceId) ?? sourceId),
    dependsOnMatchIds: match.dependsOnMatchIds?.map((sourceId) => generatedIdToUuid.get(sourceId) ?? sourceId)
  }));
}

async function seedMatches(
  supabase: AdminClient,
  matches: Match[],
  venueByCourt: Map<string, string>
) {
  const rows = matches.map((match) => ({
    id: match.id,
    event_id: eventId,
    round: match.round,
    stage: match.stage,
    bracket_position: match.bracketPosition,
    next_match_id: match.nextMatchId ?? null,
    is_home_next: match.isHomeNext ?? null,
    label: match.label,
    home_team_id: match.homeTeamId || null,
    away_team_id: match.awayTeamId || null,
    home_placeholder: match.homePlaceholder,
    away_placeholder: match.awayPlaceholder,
    home_source_match_id: match.homeSourceMatchId ?? null,
    away_source_match_id: match.awaySourceMatchId ?? null,
    source_match_ids: match.sourceMatchIds ?? [],
    depends_on_match_ids: match.dependsOnMatchIds ?? [],
    scheduled_at: match.scheduledAt,
    scheduled_end_at: match.scheduledEndAt,
    venue_id: venueByCourt.get(match.court) ?? null,
    status: "scheduled",
    live_status: "scheduled",
    fixture_status: "published",
    is_fixture_preliminary: false,
    home_score: null,
    away_score: null,
    penalty_home_score: 0,
    penalty_away_score: 0,
    notes: "Partido de capacitacion arbitral. Puede reiniciarse ejecutando npm run seed:referee-training."
  }));

  await requireOk(supabase.from("matches").insert(rows), "fixture de capacitacion");
}

async function seedRefereeAssignments(
  supabase: AdminClient,
  matches: Match[],
  refereeEmails: string[]
) {
  const rows = matches.map((match, index) => {
    const refereeEmail = refereeEmails[index % refereeEmails.length];
    return {
      id: assignmentId(index + 1),
      match_id: match.id,
      referee_user_id: null,
      referee_email: refereeEmail,
      referee_name: `Arbitro Capacitacion ${index % refereeEmails.length + 1}`,
      active: true,
      updated_at: new Date().toISOString()
    };
  });

  await requireOk(supabase.from("referee_assignments").insert(rows), "asignaciones arbitrales");
  await linkExistingRefereeUsers(supabase, refereeEmails);
}

async function resolveRefereeEmails(supabase: AdminClient) {
  const configured = (process.env.REFEREE_TRAINING_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) return configured;

  const { data, error } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!error) {
    const adminEmails = ((data ?? []) as Array<{ email: string }>)
      .map((row) => row.email.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0) return adminEmails;
  }

  return ["renzomamanigalindo@gmail.com"];
}

async function linkExistingRefereeUsers(supabase: AdminClient, refereeEmails: string[]) {
  const usersByEmail = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    for (const user of data.users) {
      const email = user.email?.trim().toLowerCase();
      if (email) usersByEmail.set(email, user.id);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  for (const email of refereeEmails) {
    const userId = usersByEmail.get(email);
    if (!userId) continue;

    await requireOk(
      supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: "referee",
            full_name: `Arbitro Capacitacion ${email}`,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        ),
      `perfil arbitro ${email}`
    );

    await requireOk(
      supabase
        .from("referee_assignments")
        .update({
          referee_user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq("referee_email", email)
        .eq("active", true),
      `vincular arbitro ${email}`
    );
  }
}

async function validateSeed(supabase: AdminClient) {
  const teamsResponse = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (teamsResponse.error) throw new Error(teamsResponse.error.message);

  const teamIds = teamSeedData.map(([suffix]) => teamId(suffix));
  const playersResponse = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .in("team_id", teamIds);
  if (playersResponse.error) throw new Error(playersResponse.error.message);

  const matchesResponse = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (matchesResponse.error) throw new Error(matchesResponse.error.message);

  const assignmentsResponse = await supabase
    .from("referee_assignments")
    .select("id", { count: "exact", head: true })
    .in("match_id", Array.from({ length: 12 }, (_, index) => matchId(index + 1)));
  if (assignmentsResponse.error) throw new Error(assignmentsResponse.error.message);

  if (
    teamsResponse.count !== 12 ||
    playersResponse.count !== 168 ||
    matchesResponse.count !== 12 ||
    assignmentsResponse.count !== 12
  ) {
    throw new Error(
      `Seed incompleto: teams=${teamsResponse.count}, players=${playersResponse.count}, matches=${matchesResponse.count}, assignments=${assignmentsResponse.count}`
    );
  }
}

function teamId(suffix: string) {
  return `77777777-7777-4777-8777-7777777777${suffix}`;
}

function registrationCodeId(index: number) {
  return `88888888-8888-4888-8888-8888888888${String(index).padStart(2, "0")}`;
}

function playerId(teamIndex: number, playerIndex: number) {
  return `99999999-9999-4999-8999-99999999${String(teamIndex).padStart(2, "0")}${String(playerIndex).padStart(2, "0")}`;
}

function matchId(index: number) {
  return `77777777-7777-4777-8777-77777777${String(index).padStart(4, "0")}`;
}

function assignmentId(index: number) {
  return `66666666-6666-4666-8666-66666666${String(index).padStart(4, "0")}`;
}

async function requireOk<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { error } = await promise;
  if (error) throw new Error(`Fallo al insertar ${label}: ${error.message}`);
}

function limaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function loadEnvFile(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
