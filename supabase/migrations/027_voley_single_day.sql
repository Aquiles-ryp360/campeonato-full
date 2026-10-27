-- Voley Mixto IME en un solo dia: 1 losa, partidos de 25 min (1 set a 20) y final al mejor de 3.
update public.events
set max_teams = 12,
    third_place = false,
    minimum_rest_minutes = 30,
    rules_summary = 'Un solo día en 1 losa. 4 grupos de 3; clasifican 1.° y 2.° a cuartos. Grupos, cuartos y semifinales a 1 set de 20 puntos; final al mejor de 3 (20, 20 y 10). Diferencia de 2; topes 22 y 12.',
    schedule_config = coalesce(schedule_config, '{}'::jsonb) || '{
      "startTime": "08:00",
      "matchDurationMinutes": 25,
      "transitionMinutes": 5,
      "minimumRestMinutes": 30,
      "courts": ["Losa Voley Principal"],
      "courtCount": 1,
      "estimatedEndTime": "18:30"
    }'::jsonb,
    updated_at = now()
where id = '11111111-1111-4111-8111-111111111122'::uuid
   or slug = 'voley-2026'
   or name ilike 'Campeonato Voley Mixto Ingenieria Mecanica Electrica%';

update public.tournament_bases
set description = 'Bases oficiales para el campeonato de Voley Mixto. Un solo dia: 1 set a 20 en grupos, cuartos y semifinales; final al mejor de 3. Inscripcion: S/25 por equipo.',
    match_duration = 25,
    tiebreaker_rules = 'Puntos (victoria 2, derrota 0), diferencia de puntos anotados, puntos a favor, menos puntos en contra y sorteo.',
    updated_at = now()
where id = '44444444-4444-4444-8444-444444444422'::uuid;
