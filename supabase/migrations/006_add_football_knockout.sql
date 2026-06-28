-- Seed football knockout event used by the admin draw panel.
-- This migration is safe to run after 005_championship_expansion.sql.

DO $$
DECLARE
  v_sport_id uuid;
  v_format_id uuid;
  v_event_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'sport_id'
  ) THEN
    SELECT id INTO v_sport_id
    FROM public.sports
    WHERE name ILIKE 'F%tbol 11'
    LIMIT 1;

    IF v_sport_id IS NULL THEN
      INSERT INTO public.sports (name, players_per_team, match_duration)
      VALUES ('Futbol 11', 11, 90)
      RETURNING id INTO v_sport_id;
    ELSE
      UPDATE public.sports
      SET players_per_team = 11,
          match_duration = 90
      WHERE id = v_sport_id;
    END IF;

    INSERT INTO public.competition_formats (name, key, description)
    VALUES ('Eliminacion Directa', 'single_elimination', 'Llaves de playoff directas.')
    ON CONFLICT (key) DO NOTHING;

    SELECT id INTO v_format_id FROM public.competition_formats WHERE key = 'single_elimination' LIMIT 1;

    INSERT INTO public.events (
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
      minimum_rest_minutes
    )
    VALUES (
      v_event_id,
      'Campeonato Futbol 11',
      'campeonato-futbol-11-2026',
      v_sport_id,
      'Libre',
      v_format_id,
      'in_progress',
      40,
      '2026-07-18 23:59:00-05',
      8,
      11,
      18,
      0,
      0,
      0,
      'Eliminacion directa. Empates por penales. Sorteo admin antes de publicar llaves.',
      true,
      120
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        sport_id = EXCLUDED.sport_id,
        format_id = EXCLUDED.format_id,
        max_teams = EXCLUDED.max_teams,
        min_players = EXCLUDED.min_players,
        max_players = EXCLUDED.max_players,
        rules_summary = EXCLUDED.rules_summary;

    INSERT INTO public.venues (id, name, location)
    VALUES ('22222222-2222-4222-8222-222222222222', 'Campo Futbol 11 Principal', 'Estadio del campus')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        location = EXCLUDED.location;

    INSERT INTO public.teams (
      id,
      event_id,
      name,
      delegate_name,
      delegate_phone,
      delegate_email,
      academic_career,
      primary_color,
      secondary_color,
      status
    )
    VALUES
      ('33333333-3333-4333-8333-333333333331', v_event_id, 'Sistemas FC', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria de Sistemas', '#2563eb', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333332', v_event_id, 'Industrial United', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria Industrial', '#dc2626', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333333', v_event_id, 'Civil Club', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria Civil', '#16a34a', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333334', v_event_id, 'Minas FC', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria de Minas', '#7c3aed', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333335', v_event_id, 'Electrica 11', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria Electrica', '#0f766e', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333336', v_event_id, 'Mecanica Power', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria Mecanica', '#ea580c', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333337', v_event_id, 'Arquitectura FC', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Arquitectura', '#be123c', '#f8fafc', 'approved'),
      ('33333333-3333-4333-8333-333333333338', v_event_id, 'Agro Champions', 'Delegado por confirmar', '000 000 000', 'delegado@campeonato.local', 'Ingenieria Agroindustrial', '#65a30d', '#f8fafc', 'approved')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        academic_career = EXCLUDED.academic_career,
        primary_color = EXCLUDED.primary_color,
        status = EXCLUDED.status;
  END IF;
END $$;
