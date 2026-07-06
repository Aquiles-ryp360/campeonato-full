import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFutsal10Seed, futsal10EventId } from "../src/lib/futsal-10-seed";

loadEnvFile(".env");
loadEnvFile(".env.local");

const data = buildFutsal10Seed();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const catalogIds = {
  sport: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
  format: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01"
};

async function main() {
  console.log("Seed objetivo: Futsal Varones 2026");
  console.log(`Campeonatos: ${data.events.length}`);
  console.log(`Equipos: ${data.teams.length}`);
  console.log(`Jugadores: ${data.players.length}`);
  console.log(`Partidos generados: ${data.matches.length}`);

  if (!url || !serviceRoleKey) {
    console.log("Supabase admin no configurado. No se modifica servidor.");
    console.log("Modo mock listo: src/lib/mock-data.ts usa la misma seed.");
    return;
  }

  if (process.env.RESET_SERVER_DATA !== "true") {
    throw new Error("Para borrar datos deportivos del servidor ejecuta con RESET_SERVER_DATA=true.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await assertFixtureSchemaReady(supabase);
  const adminEmailsBefore = await getAdminEmails(supabase);

  console.log("Se borraran datos deportivos: matches, players, teams, registration_codes, events, bases y venues.");
  console.log(`Correos admin preservados: ${adminEmailsBefore.length}`);
  await resetSportsData(supabase);
  await seedCatalogs(supabase);
  await seedEvent(supabase);
  await seedVenues(supabase);
  await seedRegistrationCodes(supabase);
  await seedTeams(supabase);
  await linkRegistrationCodes(supabase);
  await seedPlayers(supabase);
  await seedBases(supabase);
  await seedMatches(supabase);
  await validateAdminEmailsPreserved(supabase, adminEmailsBefore);
  await validateServerSeed(supabase);

  console.log("Seed Supabase completada.");
  console.log("Resumen final:");
  console.log(`- Campeonato: ${data.events[0].name}`);
  console.log(`- Equipos: ${data.teams.length}`);
  console.log(`- Jugadores: ${data.players.length}`);
  console.log(`- Fixture preliminar: ${data.matches.length} partidos`);
}

type AdminClient = SupabaseClient;
type IdResponse = PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;

async function assertFixtureSchemaReady(supabase: AdminClient) {
  const [eventsCheck, matchesCheck] = await Promise.all([
    supabase
      .from("events")
      .select("event_date,fixture_status,seeding_mode,third_place,allow_byes,penalties_enabled,fixture_compact_preview,schedule_config")
      .limit(1),
    supabase
      .from("matches")
      .select("label,home_placeholder,away_placeholder,source_match_ids,depends_on_match_ids,scheduled_end_at,fixture_status,is_fixture_preliminary")
      .limit(1)
  ]);

  const errors = [eventsCheck.error?.message, matchesCheck.error?.message].filter(Boolean);
  if (errors.length === 0) return;

  throw new Error(
    [
      "No se borro nada: falta aplicar supabase/migrations/009_fixture_automation.sql en Supabase.",
      "El fixture real necesita columnas de lifecycle y placeholders; sin eso quedaria una seed incompleta.",
      ...errors.map((message) => `- ${message}`)
    ].join("\n")
  );
}

async function getAdminEmails(supabase: AdminClient) {
  const { data: rows, error } = await supabase.from("admin_emails").select("email").order("email", { ascending: true });
  if (error) throw new Error(`No se pudo leer admin_emails antes del reset: ${error.message}`);
  return ((rows ?? []) as unknown as Array<{ email: string }>).map((row) => row.email);
}

async function validateAdminEmailsPreserved(supabase: AdminClient, before: string[]) {
  const after = await getAdminEmails(supabase);
  if (before.join("\n") !== after.join("\n")) {
    throw new Error("Los correos admin cambiaron durante el seed. Revisa admin_emails antes de continuar.");
  }
}

async function validateServerSeed(supabase: AdminClient) {
  const [events, teams, players, matches] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true })
  ]);

  for (const [label, result] of Object.entries({ events, teams, players, matches })) {
    if (result.error) throw new Error(`No se pudo validar ${label}: ${result.error.message}`);
  }

  if (events.count !== 1 || teams.count !== 12 || (players.count ?? 0) < 96 || matches.count !== 12) {
    throw new Error(
      `Seed incompleta en Supabase: events=${events.count}, teams=${teams.count}, players=${players.count}, matches=${matches.count}`
    );
  }
}

async function resetSportsData(supabase: AdminClient) {
  const tables = [
    "match_goals",
    "match_cards",
    "audio_result_drafts",
    "matches",
    "group_standings",
    "group_teams",
    "groups",
    "players",
    "teams",
    "registration_codes",
    "tournament_bases",
    "events",
    "venues"
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-4000-8000-000000000000");
    if (error) {
      console.warn(`No se pudo limpiar ${table}: ${error.message}`);
    }
  }
}

async function seedCatalogs(supabase: AdminClient) {
  const sport = await requireOk(
    supabase
      .from("sports")
      .upsert({ name: "Futsal", players_per_team: 5, match_duration: 20, active: true }, { onConflict: "name" })
      .select("id")
      .single() as IdResponse,
    "sport Futsal"
  );
  catalogIds.sport = String(sport.id);

  const format = await requireOk(
    supabase
      .from("competition_formats")
      .upsert({
        name: "Eliminacion Directa",
        key: "single_elimination",
        description: "Llave automatica con preliminares y byes.",
        active: true
      }, { onConflict: "key" })
      .select("id")
      .single() as IdResponse,
    "formato eliminacion"
  );
  catalogIds.format = String(format.id);
}

async function seedEvent(supabase: AdminClient) {
  const event = data.events[0];
  const enhancedRow = {
    id: event.id,
    name: event.name,
    slug: "futsal-varones-2026",
    sport_id: catalogIds.sport,
    category: event.category,
    format_id: catalogIds.format,
    status: event.status,
    registration_fee: event.registrationFee,
    registration_open_until: event.registrationOpenUntil,
    max_teams: event.maxTeams,
    min_players: event.minPlayers,
    max_players: event.maxPlayers,
    points_win: event.pointsWin,
    points_draw: event.pointsDraw,
    points_loss: event.pointsLoss,
    rules_summary: event.rulesSummary,
    prevent_cross_sport_conflicts: event.preventCrossSportConflicts,
    minimum_rest_minutes: event.minimumRestMinutes,
    event_date: event.eventDate,
    fixture_status: event.fixtureStatus,
    seeding_mode: event.seedingMode,
    third_place: event.thirdPlace,
    allow_byes: event.allowByes,
    penalties_enabled: event.penaltiesEnabled,
    fixture_compact_preview: event.fixtureCompactPreview,
    schedule_config: event.scheduleConfig
  };

  const response = await supabase.from("events").upsert(enhancedRow).select("id").single();
  if (!response.error) return;

  console.warn(`No se pudo insertar metadata avanzada del evento: ${response.error.message}`);
  console.warn("Revisa que la migracion 009_fixture_automation.sql este aplicada.");
  await requireOk(
    supabase
      .from("events")
      .upsert({
        id: event.id,
        name: event.name,
        slug: "futsal-varones-2026",
        sport_id: catalogIds.sport,
        category: event.category,
        format_id: catalogIds.format,
        status: event.status,
        registration_fee: event.registrationFee,
        registration_open_until: event.registrationOpenUntil,
        max_teams: event.maxTeams,
        min_players: event.minPlayers,
        max_players: event.maxPlayers,
        points_win: event.pointsWin,
        points_draw: event.pointsDraw,
        points_loss: event.pointsLoss,
        rules_summary: event.rulesSummary,
        prevent_cross_sport_conflicts: event.preventCrossSportConflicts,
        minimum_rest_minutes: event.minimumRestMinutes
      })
      .select("id")
      .single(),
    "evento base"
  );
}

async function seedVenues(supabase: AdminClient) {
  for (const venue of data.venues) {
    await requireOk(
      supabase
        .from("venues")
        .upsert({ id: venue.id, name: venue.name, location: venue.location, active: venue.active })
        .select("id")
        .single(),
      `cancha ${venue.name}`
    );
  }
}

async function seedRegistrationCodes(supabase: AdminClient) {
  for (const code of data.registrationCodes) {
    await requireOk(
      supabase
        .from("registration_codes")
        .insert({
          event_id: code.eventId,
          code: code.code,
          method: code.paymentMethod,
          amount: 40,
          status: "available"
        })
        .select("id")
        .single(),
      `codigo ${code.code}`
    );
  }
}

async function seedTeams(supabase: AdminClient) {
  for (const team of data.teams) {
    await requireOk(
      supabase
        .from("teams")
        .insert({
          id: team.id,
          event_id: team.eventId,
          name: team.name,
          delegate_name: team.delegateName,
          delegate_phone: team.delegatePhone,
          delegate_email: team.delegateEmail,
          academic_career: team.academicCareer,
          primary_color: team.primaryColor,
          secondary_color: team.secondaryColor,
          status: team.status
        })
        .select("id")
        .single(),
      `equipo ${team.name}`
    );
  }
}

async function linkRegistrationCodes(supabase: AdminClient) {
  for (const team of data.teams) {
    const { data: code, error } = await supabase
      .from("registration_codes")
      .select("id")
      .eq("event_id", futsal10EventId)
      .eq("code", team.registrationCode)
      .single();

    if (error || !code) {
      console.warn(`No se pudo vincular codigo de ${team.name}: ${error?.message ?? "sin codigo"}`);
      continue;
    }

    await supabase.from("teams").update({ registration_code_id: code.id }).eq("id", team.id);
    await supabase.from("registration_codes").update({ status: "used", used_by_team_id: team.id }).eq("id", code.id);
  }
}

async function seedPlayers(supabase: AdminClient) {
  for (const player of data.players) {
    await requireOk(
      supabase
        .from("players")
        .insert({
          team_id: player.teamId,
          first_name: player.firstName,
          last_name: player.lastName,
          dni: player.dni,
          student_code: player.studentCode,
          enrollment_file: player.enrollmentFile,
          semester: player.semester,
          lineup_role: player.lineupRole
        })
        .select("id")
        .single(),
      `jugador ${player.studentCode}`
    );
  }
}

async function seedBases(supabase: AdminClient) {
  const base = data.tournamentBases[0];
  await requireOk(
    supabase
      .from("tournament_bases")
      .insert({
        championship_name: base.championshipName,
        year: base.year,
        organizer: base.organizer,
        start_date: base.startDate,
        end_date: base.endDate,
        description: base.description,
        match_duration: base.matchDuration,
        points_win: base.pointsWin,
        points_draw: base.pointsDraw,
        points_loss: base.pointsLoss,
        tiebreaker_rules: base.tiebreakerRules,
        walkover_rules: base.walkoverRules,
        max_players_per_team: base.maxPlayersPerTeam,
        sanctions: base.sanctions,
        published: base.published
      })
      .select("id")
      .single(),
    "bases"
  );
}

async function seedMatches(supabase: AdminClient) {
  const venueByName = new Map(data.venues.map((venue) => [venue.name, venue.id]));
  const rows = data.matches.map((match) => ({
    event_id: match.eventId,
    round: match.round,
    stage: match.stage,
    bracket_position: match.bracketPosition,
    label: match.label,
    home_team_id: match.homeTeamId || null,
    away_team_id: match.awayTeamId || null,
    home_placeholder: match.homePlaceholder,
    away_placeholder: match.awayPlaceholder,
    home_source_match_id: match.homeSourceMatchId,
    away_source_match_id: match.awaySourceMatchId,
    source_match_ids: match.sourceMatchIds ?? [],
    depends_on_match_ids: match.dependsOnMatchIds ?? [],
    scheduled_at: match.scheduledAt,
    scheduled_end_at: match.scheduledEndAt,
    venue_id: venueByName.get(match.court),
    status: match.status,
    fixture_status: match.fixtureStatus,
    is_fixture_preliminary: match.isFixturePreliminary,
    notes: match.isFixturePreliminary
      ? "Fixture preliminar generado automaticamente. Puede cambiar hasta cierre de inscripciones."
      : match.notes
  }));

  const { error } = await supabase.from("matches").insert(rows);
  if (!error) return;

  throw new Error(`No se pudo insertar fixture completo: ${error.message}`);
}

async function requireOk<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await promise;
  if (error) throw new Error(`Fallo al insertar ${label}: ${error.message}`);
  if (data === null) throw new Error(`Fallo al insertar ${label}: respuesta sin datos.`);
  return data;
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
