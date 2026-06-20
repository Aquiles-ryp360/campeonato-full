insert into public.events (
  name,
  slug,
  sport,
  category,
  format,
  status,
  registration_fee,
  registration_open_until,
  max_teams,
  min_players,
  max_players,
  points_win,
  points_draw,
  points_loss,
  rules_summary
)
values
  (
    'Campeonato Futsal Varones',
    'futsal-2026',
    'futsal',
    'Varones',
    'league',
    'registration',
    40,
    '2026-07-05 23:59:00-05',
    12,
    6,
    12,
    3,
    1,
    0,
    'Todos contra todos. Clasifican los cuatro mejores a semifinal.'
  ),
  (
    'Campeonato Voley Mixto',
    'voley-2026',
    'voley',
    'Mixto',
    'groups_then_knockout',
    'registration',
    40,
    '2026-07-10 23:59:00-05',
    10,
    6,
    10,
    2,
    0,
    0,
    'Dos grupos. Pasan los dos mejores de cada grupo.'
  ),
  (
    'Campeonato Futsal Damas',
    'futsal-damas-2026',
    'futsal',
    'Damas',
    'single_elimination',
    'registration',
    40,
    '2026-08-01 23:59:00-05',
    8,
    5,
    10,
    0,
    0,
    0,
    'Eliminacion directa con penales si empatan.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  sport = excluded.sport,
  category = excluded.category,
  format = excluded.format,
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
  updated_at = now();

with desired_codes(slug, code, method) as (
  values
    ('futsal-2026', 'FUT-VAR-001', 'yape'),
    ('futsal-2026', 'FUT-VAR-002', 'yape'),
    ('futsal-2026', 'FUT-VAR-003', 'yape'),
    ('futsal-2026', 'FUT-VAR-004', 'plin'),
    ('futsal-2026', 'FUT-VAR-005', 'yape'),
    ('voley-2026', 'VOL-MIX-001', 'yape'),
    ('voley-2026', 'VOL-MIX-002', 'yape'),
    ('voley-2026', 'VOL-MIX-003', 'plin'),
    ('voley-2026', 'VOL-MIX-004', 'yape'),
    ('voley-2026', 'VOL-MIX-005', 'yape'),
    ('futsal-damas-2026', 'FUT-DAM-001', 'yape'),
    ('futsal-damas-2026', 'FUT-DAM-002', 'plin'),
    ('futsal-damas-2026', 'FUT-DAM-003', 'yape')
)
insert into public.registration_codes (event_id, method, code, amount, status)
select
  events.id,
  desired_codes.method::public.payment_method,
  desired_codes.code,
  40,
  'available'
from desired_codes
join public.events on events.slug = desired_codes.slug
where not exists (
  select 1
  from public.registration_codes existing_codes
  where existing_codes.event_id = events.id
    and existing_codes.code = desired_codes.code
);
