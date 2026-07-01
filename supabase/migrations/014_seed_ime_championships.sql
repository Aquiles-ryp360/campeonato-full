-- Official initial championships for Ingenieria Mecanica Electrica.
-- Keeps production Supabase aligned with the public registration flow and bases PDF.

do $$
declare
  v_football_sport_id uuid;
  v_voley_sport_id uuid;
  v_knockout_format_id uuid;
  v_groups_format_id uuid;
  v_football_event_id uuid;
  v_voley_event_id uuid;
  v_football_venue_id uuid;
  v_voley_venue_id uuid;
begin
  select id
  into v_football_sport_id
  from public.sports
  where players_per_team = 11
    and lower(name) like '%tbol%'
  order by created_at
  limit 1;

  if v_football_sport_id is null then
    insert into public.sports (name, players_per_team, match_duration)
    values ('Futbol 11', 11, 90)
    returning id into v_football_sport_id;
  else
    update public.sports
    set name = 'Futbol 11',
        players_per_team = 11,
        match_duration = 90,
        active = true
    where id = v_football_sport_id;
  end if;

  select id
  into v_voley_sport_id
  from public.sports
  where players_per_team = 6
    and (lower(name) like '%voley%' or lower(name) like '%volley%' or lower(name) like '%ley%')
  order by created_at
  limit 1;

  if v_voley_sport_id is null then
    insert into public.sports (name, players_per_team, match_duration)
    values ('Voley', 6, 45)
    returning id into v_voley_sport_id;
  else
    update public.sports
    set name = 'Voley',
        players_per_team = 6,
        match_duration = 45,
        active = true
    where id = v_voley_sport_id;
  end if;

  insert into public.competition_formats (name, key, description)
  values
    ('Eliminacion Directa', 'single_elimination', 'Llaves de playoff directas.'),
    ('Grupos + Eliminacion', 'groups_then_knockout', 'Fase de grupos seguida de playoffs.')
  on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      active = true;

  select id into v_knockout_format_id
  from public.competition_formats
  where key = 'single_elimination'
  limit 1;

  select id into v_groups_format_id
  from public.competition_formats
  where key = 'groups_then_knockout'
  limit 1;

  insert into public.venues (name, location)
  values
    ('Campo Futbol 11 Principal', 'Campus Ingenieria Mecanica Electrica'),
    ('Losa Voley Principal', 'Campus Ingenieria Mecanica Electrica')
  on conflict (name) do update
  set location = excluded.location,
      active = true;

  select id into v_football_venue_id
  from public.venues
  where name = 'Campo Futbol 11 Principal'
  limit 1;

  select id into v_voley_venue_id
  from public.venues
  where name = 'Losa Voley Principal'
  limit 1;

  insert into public.venue_sports (venue_id, sport_id)
  values
    (v_football_venue_id, v_football_sport_id),
    (v_voley_venue_id, v_voley_sport_id)
  on conflict do nothing;

  select id
  into v_football_event_id
  from public.events
  where id = '11111111-1111-4111-8111-111111111111'::uuid
     or slug = 'campeonato-futbol-11-2026'
  limit 1;

  v_football_event_id := coalesce(v_football_event_id, '11111111-1111-4111-8111-111111111111'::uuid);

  insert into public.events (
    id,
    name,
    slug,
    sport_id,
    category,
    format_id,
    status,
    registration_fee,
    registration_open_until,
    max_teams,
    min_players,
    max_players,
    points_win,
    points_draw,
    points_loss,
    rules_summary,
    prevent_cross_sport_conflicts,
    minimum_rest_minutes,
    event_date,
    fixture_status,
    seeding_mode,
    third_place,
    allow_byes,
    penalties_enabled,
    public_live_scores,
    fixture_compact_preview,
    schedule_config
  )
  values (
    v_football_event_id,
    'Campeonato Futbol 11 Ingenieria Mecanica Electrica',
    'campeonato-futbol-11-2026',
    v_football_sport_id,
    'Libre',
    v_knockout_format_id,
    'registration',
    35,
    '2026-07-08 23:59:00-05',
    8,
    11,
    18,
    0,
    0,
    0,
    'Eliminacion directa. Empates por penales. Inscripcion oficial del campeonato de Ingenieria Mecanica Electrica.',
    true,
    120,
    '2026-07-09 08:00:00-05',
    'draft_auto',
    'registration_order',
    false,
    true,
    true,
    true,
    true,
    '{
      "startTime": "08:00",
      "matchDurationMinutes": 90,
      "halfTimeMinute": 45,
      "halfTimeBreakMinutes": 10,
      "matchStartToleranceMinutes": 10,
      "allowManualFinish": true,
      "transitionMinutes": 20,
      "courts": ["Campo Futbol 11 Principal"],
      "courtCount": 1,
      "minimumRestMinutes": 120,
      "allowCompactPreview": true,
      "estimatedEndTime": "18:00"
    }'::jsonb
  )
  on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      sport_id = excluded.sport_id,
      category = excluded.category,
      format_id = excluded.format_id,
      status = excluded.status,
      registration_fee = excluded.registration_fee,
      registration_open_until = excluded.registration_open_until,
      max_teams = excluded.max_teams,
      min_players = excluded.min_players,
      max_players = excluded.max_players,
      points_win = excluded.points_win,
      points_draw = excluded.points_draw,
      points_loss = excluded.points_loss,
      rules_summary = excluded.rules_summary,
      prevent_cross_sport_conflicts = excluded.prevent_cross_sport_conflicts,
      minimum_rest_minutes = excluded.minimum_rest_minutes,
      event_date = excluded.event_date,
      fixture_status = excluded.fixture_status,
      seeding_mode = excluded.seeding_mode,
      third_place = excluded.third_place,
      allow_byes = excluded.allow_byes,
      penalties_enabled = excluded.penalties_enabled,
      public_live_scores = excluded.public_live_scores,
      fixture_compact_preview = excluded.fixture_compact_preview,
      schedule_config = excluded.schedule_config,
      updated_at = now()
  returning id into v_football_event_id;

  select id
  into v_voley_event_id
  from public.events
  where slug = 'voley-2026'
     or id = '11111111-1111-4111-8111-111111111122'::uuid
  limit 1;

  v_voley_event_id := coalesce(v_voley_event_id, '11111111-1111-4111-8111-111111111122'::uuid);

  insert into public.events (
    id,
    name,
    slug,
    sport_id,
    category,
    format_id,
    status,
    registration_fee,
    registration_open_until,
    max_teams,
    min_players,
    max_players,
    points_win,
    points_draw,
    points_loss,
    rules_summary,
    prevent_cross_sport_conflicts,
    minimum_rest_minutes,
    event_date,
    fixture_status,
    seeding_mode,
    third_place,
    allow_byes,
    penalties_enabled,
    public_live_scores,
    fixture_compact_preview,
    schedule_config
  )
  values (
    v_voley_event_id,
    'Campeonato Voley Mixto Ingenieria Mecanica Electrica',
    'voley-2026',
    v_voley_sport_id,
    'Mixto',
    v_groups_format_id,
    'registration',
    25,
    '2026-07-08 23:59:00-05',
    10,
    6,
    12,
    2,
    0,
    0,
    'Fase de grupos y eliminacion. Sets a 15, 15 y desempate a 10. Inscripcion oficial del campeonato de Ingenieria Mecanica Electrica.',
    true,
    45,
    '2026-07-09 08:00:00-05',
    'draft_auto',
    'registration_order',
    false,
    true,
    false,
    true,
    true,
    '{
      "startTime": "08:00",
      "matchDurationMinutes": 45,
      "matchStartToleranceMinutes": 10,
      "allowManualFinish": true,
      "transitionMinutes": 10,
      "courts": ["Losa Voley Principal"],
      "courtCount": 1,
      "minimumRestMinutes": 45,
      "allowCompactPreview": true,
      "estimatedEndTime": "18:00"
    }'::jsonb
  )
  on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      sport_id = excluded.sport_id,
      category = excluded.category,
      format_id = excluded.format_id,
      status = excluded.status,
      registration_fee = excluded.registration_fee,
      registration_open_until = excluded.registration_open_until,
      max_teams = excluded.max_teams,
      min_players = excluded.min_players,
      max_players = excluded.max_players,
      points_win = excluded.points_win,
      points_draw = excluded.points_draw,
      points_loss = excluded.points_loss,
      rules_summary = excluded.rules_summary,
      prevent_cross_sport_conflicts = excluded.prevent_cross_sport_conflicts,
      minimum_rest_minutes = excluded.minimum_rest_minutes,
      event_date = excluded.event_date,
      fixture_status = excluded.fixture_status,
      seeding_mode = excluded.seeding_mode,
      third_place = excluded.third_place,
      allow_byes = excluded.allow_byes,
      penalties_enabled = excluded.penalties_enabled,
      public_live_scores = excluded.public_live_scores,
      fixture_compact_preview = excluded.fixture_compact_preview,
      schedule_config = excluded.schedule_config,
      updated_at = now()
  returning id into v_voley_event_id;

  insert into public.registration_codes (event_id, method, code, amount, status)
  values
    (v_football_event_id, 'yape'::public.payment_method, 'FUT11-IME-001', 35, 'available'::public.registration_code_status),
    (v_football_event_id, 'yape'::public.payment_method, 'FUT11-IME-002', 35, 'available'::public.registration_code_status),
    (v_football_event_id, 'plin'::public.payment_method, 'FUT11-IME-003', 35, 'available'::public.registration_code_status),
    (v_football_event_id, 'yape'::public.payment_method, 'FUT11-IME-004', 35, 'available'::public.registration_code_status),
    (v_football_event_id, 'plin'::public.payment_method, 'FUT11-IME-005', 35, 'available'::public.registration_code_status),
    (v_voley_event_id, 'yape'::public.payment_method, 'VOL-MIX-001', 25, 'available'::public.registration_code_status),
    (v_voley_event_id, 'yape'::public.payment_method, 'VOL-MIX-002', 25, 'available'::public.registration_code_status),
    (v_voley_event_id, 'plin'::public.payment_method, 'VOL-MIX-003', 25, 'available'::public.registration_code_status),
    (v_voley_event_id, 'yape'::public.payment_method, 'VOL-MIX-004', 25, 'available'::public.registration_code_status),
    (v_voley_event_id, 'plin'::public.payment_method, 'VOL-MIX-005', 25, 'available'::public.registration_code_status)
  on conflict (event_id, code) do update
  set method = excluded.method,
      amount = excluded.amount,
      status = case
        when public.registration_codes.status = 'used' then public.registration_codes.status
        else excluded.status
      end;

  insert into public.tournament_bases (
    id,
    championship_name,
    year,
    organizer,
    start_date,
    end_date,
    description,
    match_duration,
    points_win,
    points_draw,
    points_loss,
    tiebreaker_rules,
    walkover_rules,
    max_players_per_team,
    sanctions,
    published
  )
  values
    (
      '44444444-4444-4444-8444-444444444411'::uuid,
      'Campeonato Futbol 11 Ingenieria Mecanica Electrica',
      2026,
      'Comision deportiva de Ingenieria Mecanica Electrica',
      '2026-07-09 08:00:00-05',
      '2026-07-09 18:00:00-05',
      'Bases oficiales para el campeonato de Futbol 11. Inscripcion: S/35 por equipo.',
      90,
      0,
      0,
      0,
      'En eliminacion directa, empate al final del tiempo reglamentario se define por penales.',
      'Tolerancia maxima de 10 minutos. Ausencia implica W.O. segun decision de mesa.',
      18,
      'Tarjeta roja directa suspende al jugador por una fecha como minimo.',
      true
    ),
    (
      '44444444-4444-4444-8444-444444444422'::uuid,
      'Campeonato Voley Mixto Ingenieria Mecanica Electrica',
      2026,
      'Comision deportiva de Ingenieria Mecanica Electrica',
      '2026-07-09 08:00:00-05',
      '2026-07-09 18:00:00-05',
      'Bases oficiales para el campeonato de Voley Mixto. Inscripcion: S/25 por equipo.',
      45,
      2,
      0,
      0,
      'Fase de grupos y eliminacion; la definicion se resuelve segun sets del reglamento.',
      'Tolerancia maxima de 10 minutos. Ausencia implica W.O. segun decision de mesa.',
      12,
      'Conducta antideportiva o suplantacion puede ser sancionada por la comision.',
      true
    )
  on conflict (id) do update
  set championship_name = excluded.championship_name,
      year = excluded.year,
      organizer = excluded.organizer,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      description = excluded.description,
      match_duration = excluded.match_duration,
      points_win = excluded.points_win,
      points_draw = excluded.points_draw,
      points_loss = excluded.points_loss,
      tiebreaker_rules = excluded.tiebreaker_rules,
      walkover_rules = excluded.walkover_rules,
      max_players_per_team = excluded.max_players_per_team,
      sanctions = excluded.sanctions,
      published = excluded.published,
      updated_at = now();
end $$;
