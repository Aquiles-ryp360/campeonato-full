do $$
declare
  v_football_event_id uuid;
  v_los_inges_team_id uuid := '22222222-2222-4222-8222-222222222221'::uuid;
  v_los_inges_code_id uuid;
begin
  select id into v_football_event_id
  from public.events
  where slug = 'campeonato-futbol-11-2026'
  limit 1;

  if v_football_event_id is null then
    raise exception 'No se encontro el campeonato de futbol 11 para sembrar Los Inges.';
  end if;

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
    ('22222222-2222-4222-8222-222222222231'::uuid, v_los_inges_team_id, 'Juan', 'Perez', '73124561', 'IME-LOS-001', 'enrollment-files/seed/los-inges-01.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222232'::uuid, v_los_inges_team_id, 'Carlos', 'Rios', '73124562', 'IME-LOS-002', 'enrollment-files/seed/los-inges-02.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222233'::uuid, v_los_inges_team_id, 'Miguel', 'Torres', '73124563', 'IME-LOS-003', 'enrollment-files/seed/los-inges-03.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222234'::uuid, v_los_inges_team_id, 'Luis', 'Ramirez', '73124564', 'IME-LOS-004', 'enrollment-files/seed/los-inges-04.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222235'::uuid, v_los_inges_team_id, 'Andres', 'Salazar', '73124565', 'IME-LOS-005', 'enrollment-files/seed/los-inges-05.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222236'::uuid, v_los_inges_team_id, 'Diego', 'Flores', '73124566', 'IME-LOS-006', 'enrollment-files/seed/los-inges-06.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222237'::uuid, v_los_inges_team_id, 'Jose', 'Quispe', '73124567', 'IME-LOS-007', 'enrollment-files/seed/los-inges-07.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222238'::uuid, v_los_inges_team_id, 'Raul', 'Chavez', '73124568', 'IME-LOS-008', 'enrollment-files/seed/los-inges-08.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-222222222239'::uuid, v_los_inges_team_id, 'Kevin', 'Garcia', '73124569', 'IME-LOS-009', 'enrollment-files/seed/los-inges-09.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-22222222223a'::uuid, v_los_inges_team_id, 'Pedro', 'Vargas', '73124570', 'IME-LOS-010', 'enrollment-files/seed/los-inges-10.pdf', '8vo ciclo', 'starter'),
    ('22222222-2222-4222-8222-22222222223b'::uuid, v_los_inges_team_id, 'Sergio', 'Molina', '73124571', 'IME-LOS-011', 'enrollment-files/seed/los-inges-11.pdf', '8vo ciclo', 'starter')
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
