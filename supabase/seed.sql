-- Local seed aligned with the current catalog-based schema.
-- The same official championships are also created by migration 014 for production.

do $$
declare
  v_futsal_sport_id uuid;
  v_football_sport_id uuid;
  v_voley_sport_id uuid;
  v_league_format_id uuid;
  v_knockout_format_id uuid;
  v_groups_format_id uuid;
  v_futsal_event_id uuid;
  v_football_event_id uuid;
  v_voley_event_id uuid;
  v_los_inges_team_id uuid := '22222222-2222-4222-8222-222222222221'::uuid;
  v_los_inges_code_id uuid;
begin
  insert into public.sports (name, players_per_team, match_duration)
  values
    ('Futsal', 5, 40),
    ('Futbol 11', 11, 90),
    ('Voley', 6, 45)
  on conflict (name) do update
  set players_per_team = excluded.players_per_team,
      match_duration = excluded.match_duration,
      active = true;

  select id into v_futsal_sport_id from public.sports where name = 'Futsal' limit 1;
  select id into v_football_sport_id from public.sports where name = 'Futbol 11' limit 1;
  select id into v_voley_sport_id from public.sports where name = 'Voley' limit 1;

  insert into public.competition_formats (name, key, description)
  values
    ('Liga', 'league', 'Sistema todos contra todos por puntos.'),
    ('Eliminacion Directa', 'single_elimination', 'Llaves de playoff directas.'),
    ('Grupos + Eliminacion', 'groups_then_knockout', 'Fase de grupos seguida de playoffs.')
  on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      active = true;

  select id into v_league_format_id from public.competition_formats where key = 'league' limit 1;
  select id into v_knockout_format_id from public.competition_formats where key = 'single_elimination' limit 1;
  select id into v_groups_format_id from public.competition_formats where key = 'groups_then_knockout' limit 1;

  insert into public.venues (name, location)
  values
    ('Losa Principal', 'Campus Ingenieria Mecanica Electrica'),
    ('Campo Futbol 11 Principal', 'Campus Ingenieria Mecanica Electrica'),
    ('Losa Voley Principal', 'Campus Ingenieria Mecanica Electrica')
  on conflict (name) do update
  set location = excluded.location,
      active = true;

  insert into public.venue_sports (venue_id, sport_id)
  select v.id, s.id
  from public.venues v
  cross join public.sports s
  where v.name in ('Losa Principal', 'Campo Futbol 11 Principal', 'Losa Voley Principal')
    and s.name in ('Futsal', 'Futbol 11', 'Voley')
  on conflict do nothing;

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
  values
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
      'Campeonato Futsal Varones',
      'futsal-2026',
      v_futsal_sport_id,
      'Varones',
      v_league_format_id,
      'registration',
      40,
      '2026-07-05 23:59:00-05',
      12,
      6,
      12,
      3,
      1,
      0,
      'Todos contra todos. Clasifican los cuatro mejores a semifinal.',
      true,
      40,
      '2026-07-09 08:00:00-05',
      'draft_auto',
      'registration_order',
      true,
      true,
      true,
      true,
      true,
      '{"startTime":"08:00","matchDurationMinutes":40,"transitionMinutes":10,"courts":["Losa Principal"],"minimumRestMinutes":40,"allowCompactPreview":true}'::jsonb
    ),
    (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Campeonato Futbol 11 Ingenieria Mecanica Electrica',
      'campeonato-futbol-11-2026',
      v_football_sport_id,
      'Libre',
      v_knockout_format_id,
      'registration',
      35,
      '2026-07-08 23:59:59-05',
      12,
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
      'random',
      false,
      true,
      true,
      true,
      true,
      '{"startTime":"08:00","matchDurationMinutes":90,"halfTimeMinute":45,"halfTimeBreakMinutes":10,"matchStartToleranceMinutes":10,"allowManualFinish":true,"transitionMinutes":20,"courts":["Campo Futbol 11 Principal"],"courtCount":1,"minimumRestMinutes":120,"allowCompactPreview":true,"estimatedEndTime":"18:00"}'::jsonb
    ),
    (
      '11111111-1111-4111-8111-111111111122'::uuid,
      'Campeonato Voley Mixto Ingenieria Mecanica Electrica',
      'voley-2026',
      v_voley_sport_id,
      'Mixto',
      v_groups_format_id,
      'registration',
      25,
      '2026-07-08 23:59:59-05',
      12,
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
      '{"startTime":"08:00","matchDurationMinutes":45,"matchStartToleranceMinutes":10,"allowManualFinish":true,"transitionMinutes":10,"courts":["Losa Voley Principal"],"courtCount":1,"minimumRestMinutes":45,"allowCompactPreview":true,"estimatedEndTime":"18:00"}'::jsonb
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
      updated_at = now();

  select id into v_futsal_event_id from public.events where slug = 'futsal-2026' limit 1;
  select id into v_football_event_id from public.events where slug = 'campeonato-futbol-11-2026' limit 1;
  select id into v_voley_event_id from public.events where slug = 'voley-2026' limit 1;

  insert into public.registration_codes (event_id, method, code, amount, status)
  values
    (v_futsal_event_id, 'yape'::public.payment_method, 'FUT-VAR-001', 40, 'available'::public.registration_code_status),
    (v_futsal_event_id, 'yape'::public.payment_method, 'FUT-VAR-002', 40, 'available'::public.registration_code_status),
    (v_futsal_event_id, 'plin'::public.payment_method, 'FUT-VAR-003', 40, 'available'::public.registration_code_status),
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

  select id into v_los_inges_code_id
  from public.registration_codes
  where event_id = v_football_event_id
    and code = 'FUT11-IME-001'
  limit 1;

  insert into public.teams (
    id,
    event_id,
    name,
    delegate_name,
    delegate_phone,
    delegate_email,
    primary_color,
    secondary_color,
    registration_code_id,
    status
  )
  values (
    v_los_inges_team_id,
    v_football_event_id,
    'Los Inges',
    'Delegado Los Inges',
    '999999999',
    'los.inges@unap.edu.pe',
    '#0f172a',
    '#f59e0b',
    v_los_inges_code_id,
    'registered'
  )
  on conflict (id) do update
  set event_id = excluded.event_id,
      name = excluded.name,
      delegate_name = excluded.delegate_name,
      delegate_phone = excluded.delegate_phone,
      delegate_email = excluded.delegate_email,
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      registration_code_id = excluded.registration_code_id,
      status = excluded.status,
      updated_at = now();

  insert into public.players (
    id,
    team_id,
    first_name,
    last_name,
    dni,
    student_code,
    enrollment_file,
    semester,
    lineup_role
  )
  values
    ('22222222-2222-4222-8222-222222222231'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Juan', 'Perez', '73124561', 'IME-LOS-001', 'enrollment-files/seed/los-inges-01.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222232'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Carlos', 'Rios', '73124562', 'IME-LOS-002', 'enrollment-files/seed/los-inges-02.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222233'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Miguel', 'Torres', '73124563', 'IME-LOS-003', 'enrollment-files/seed/los-inges-03.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222234'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Luis', 'Ramirez', '73124564', 'IME-LOS-004', 'enrollment-files/seed/los-inges-04.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222235'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Andres', 'Salazar', '73124565', 'IME-LOS-005', 'enrollment-files/seed/los-inges-05.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222236'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Diego', 'Flores', '73124566', 'IME-LOS-006', 'enrollment-files/seed/los-inges-06.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222237'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Jose', 'Quispe', '73124567', 'IME-LOS-007', 'enrollment-files/seed/los-inges-07.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222238'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Raul', 'Chavez', '73124568', 'IME-LOS-008', 'enrollment-files/seed/los-inges-08.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222239'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Kevin', 'Garcia', '73124569', 'IME-LOS-009', 'enrollment-files/seed/los-inges-09.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-22222222223a'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Pedro', 'Vargas', '73124570', 'IME-LOS-010', 'enrollment-files/seed/los-inges-10.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-22222222223b'::uuid, '22222222-2222-4222-8222-222222222221'::uuid, 'Sergio', 'Molina', '73124571', 'IME-LOS-011', 'enrollment-files/seed/los-inges-11.pdf', '8vo ciclo', 'starter')
  on conflict (id) do update
  set team_id = excluded.team_id,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      dni = excluded.dni,
      student_code = excluded.student_code,
      enrollment_file = excluded.enrollment_file,
      semester = excluded.semester,
      lineup_role = excluded.lineup_role,
      updated_at = now();

  update public.registration_codes
  set status = 'used',
      used_by_team_id = v_los_inges_team_id
  where id = v_los_inges_code_id;
end $$;
