-- Extends the public IME championship registrations until midnight in Peru.

update public.events
set registration_open_until = '2026-07-08 23:59:59-05'::timestamptz,
    status = 'registration'::public.event_status,
    updated_at = now()
where id in (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111122'::uuid
  )
  or slug in ('campeonato-futbol-11-2026', 'voley-2026')
  or name ilike 'Campeonato Futbol 11 Ingenieria Mecanica Electrica%'
  or name ilike 'Campeonato Voley Mixto Ingenieria Mecanica Electrica%';
