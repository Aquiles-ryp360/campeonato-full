-- Voley Mixto IME: 12 equipos, 1 losa y sets a 20 puntos (desempate a 10).
update public.events
set max_teams = 12,
    rules_summary = 'Fase de grupos y eliminación. Sets a 20, 20 y desempate a 10 (diferencia de 2; topes 22 y 12). Inscripción oficial del campeonato de Ingeniería Mecánica Eléctrica.',
    schedule_config = coalesce(schedule_config, '{}'::jsonb)
      || '{"courts": ["Losa Voley Principal"], "courtCount": 1}'::jsonb,
    updated_at = now()
where id = '11111111-1111-4111-8111-111111111122'::uuid
   or slug = 'voley-2026'
   or name ilike 'Campeonato Voley Mixto Ingenieria Mecanica Electrica%';

update public.tournament_bases
set description = 'Bases oficiales para el campeonato de Voley Mixto. Sets a 20, 20 y desempate a 10. Inscripcion: S/25 por equipo.',
    updated_at = now()
where id = '44444444-4444-4444-8444-444444444422'::uuid;
