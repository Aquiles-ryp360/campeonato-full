-- Keep the IME football championship capacity aligned with the admin setup.
update public.events
set max_teams = 12,
    updated_at = now()
where id = '11111111-1111-4111-8111-111111111111'::uuid
   or slug = 'campeonato-futbol-11-2026'
   or name ilike 'Campeonato Futbol 11 Ingenieria Mecanica Electrica%';
