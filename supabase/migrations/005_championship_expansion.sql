-- Migración SQL: Expansión del Campeonato
-- Ruta: supabase/migrations/005_championship_expansion.sql

-- ====================================================
-- 1. CREACIÓN DE NUEVAS ENTIDADES
-- ====================================================

-- 1.1 Tabla: sports (Deportes)
CREATE TABLE public.sports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    players_per_team integer NOT NULL CHECK (players_per_team > 0),
    match_duration integer NOT NULL CHECK (match_duration > 0), -- Duración en minutos
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2 Tabla: competition_formats (Formatos de Competición)
CREATE TABLE public.competition_formats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    key text NOT NULL UNIQUE, -- E.g. 'league', 'single_elimination', 'groups_then_knockout'
    description text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.3 Tabla: tournament_bases (Bases del Campeonato)
CREATE TABLE public.tournament_bases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_name text NOT NULL,
    year integer NOT NULL CHECK (year >= 2020),
    organizer text NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    description text NOT NULL DEFAULT '',
    match_duration integer NOT NULL CHECK (match_duration > 0),
    points_win integer NOT NULL DEFAULT 3,
    points_draw integer NOT NULL DEFAULT 1,
    points_loss integer NOT NULL DEFAULT 0,
    tiebreaker_rules text NOT NULL DEFAULT '',
    walkover_rules text NOT NULL DEFAULT '',
    max_players_per_team integer NOT NULL CHECK (max_players_per_team > 0),
    sanctions text NOT NULL DEFAULT '',
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT date_range_check CHECK (end_date >= start_date)
);

-- 1.4 Tabla: venues (Canchas / Sedes)
CREATE TABLE public.venues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    location text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.5 Tabla intermedia: venue_sports (Relación Canchas y Deportes)
CREATE TABLE public.venue_sports (
    venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
    sport_id uuid REFERENCES public.sports(id) ON DELETE CASCADE,
    PRIMARY KEY (venue_id, sport_id)
);

-- 1.6 Tabla: time_slots (Bloques Horarios Disponibles)
CREATE TABLE public.time_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Domingo, 1: Lunes, etc.
    start_time time NOT NULL,
    end_time time NOT NULL,
    active boolean NOT NULL DEFAULT true,
    CONSTRAINT time_range_check CHECK (end_time > start_time)
);

-- 1.7 Tabla intermedia: venue_availability (Disponibilidad de Canchas)
CREATE TABLE public.venue_availability (
    venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
    time_slot_id uuid REFERENCES public.time_slots(id) ON DELETE CASCADE,
    PRIMARY KEY (venue_id, time_slot_id)
);

-- 1.8 Tabla: groups (Grupos del Campeonato)
CREATE TABLE public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, name)
);

-- 1.9 Tabla intermedia: group_teams (Equipos en Grupos)
CREATE TABLE public.group_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, team_id)
);

-- 1.10 Tabla: group_standings (Tabla de Posiciones por Grupo)
CREATE TABLE public.group_standings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    played integer NOT NULL DEFAULT 0 CHECK (played >= 0),
    won integer NOT NULL DEFAULT 0 CHECK (won >= 0),
    drawn integer NOT NULL DEFAULT 0 CHECK (drawn >= 0),
    lost integer NOT NULL DEFAULT 0 CHECK (lost >= 0),
    goals_for integer NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
    goals_against integer NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
    goal_difference integer NOT NULL DEFAULT 0,
    points integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, team_id)
);

-- ====================================================
-- 2. INSERCIÓN DE DATOS SEMILLA / CATÁLOGOS
-- ====================================================

-- Deportes iniciales
INSERT INTO public.sports (name, players_per_team, match_duration) VALUES
('Futsal', 5, 40),
('Vóley', 6, 45),
('Fútbol 11', 11, 90)
ON CONFLICT (name) DO NOTHING;

-- Formatos iniciales
INSERT INTO public.competition_formats (name, key, description) VALUES
('Liga (Todos contra todos)', 'league', 'Sistema round robin simple por puntos.'),
('Eliminación Directa', 'single_elimination', 'Llaves de playoff directas (Octavos, Cuartos, etc.).'),
('Grupos + Eliminación', 'groups_then_knockout', 'Fase inicial de grupos seguida de playoffs para clasificados.')
ON CONFLICT (name) DO NOTHING;

-- ====================================================
-- 3. MODIFICACIÓN DE TABLAS EXISTENTES
-- ====================================================

-- 3.1 Modificaciones en 'events'
ALTER TABLE public.events 
    ADD COLUMN sport_id uuid REFERENCES public.sports(id),
    ADD COLUMN format_id uuid REFERENCES public.competition_formats(id),
    ADD COLUMN prevent_cross_sport_conflicts boolean NOT NULL DEFAULT false,
    ADD COLUMN minimum_rest_minutes integer NOT NULL DEFAULT 60 CHECK (minimum_rest_minutes >= 0);

-- Mapear y migrar datos de deportes en 'events'
UPDATE public.events e
SET sport_id = s.id
FROM public.sports s
WHERE (e.sport = 'futsal' AND s.name = 'Futsal') OR (e.sport = 'voley' AND s.name = 'Vóley');

-- Mapear y migrar datos de formatos en 'events'
UPDATE public.events e
SET format_id = f.id
FROM public.competition_formats f
WHERE e.format::text = f.key;

-- Si no hay sport_id o format_id por eventos huérfanos, asignar uno por defecto
UPDATE public.events SET sport_id = (SELECT id FROM public.sports LIMIT 1) WHERE sport_id IS NULL;
UPDATE public.events SET format_id = (SELECT id FROM public.competition_formats LIMIT 1) WHERE format_id IS NULL;

-- Hacer obligatorias las nuevas columnas y eliminar las antiguas
ALTER TABLE public.events 
    ALTER COLUMN sport_id SET NOT NULL,
    ALTER COLUMN format_id SET NOT NULL,
    DROP COLUMN sport,
    DROP COLUMN format;

-- 3.2 Modificaciones en 'teams'
ALTER TABLE public.teams
    ADD COLUMN academic_career text;

-- 3.3 Modificaciones en 'matches'
ALTER TABLE public.matches
    ADD COLUMN stage text NOT NULL DEFAULT 'group_stage' CHECK (stage IN ('group_stage', 'round_of_16', 'quarter_finals', 'semi_finals', 'final', 'third_place')),
    ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    ADD COLUMN bracket_position integer,
    ADD COLUMN next_match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
    ADD COLUMN is_home_next boolean,
    ADD COLUMN venue_id uuid REFERENCES public.venues(id);

-- Crear canchas por defecto para migrar los textos de matches.court
INSERT INTO public.venues (name, location)
SELECT DISTINCT court, 'Sede principal' FROM public.matches WHERE court IS NOT NULL AND court <> ''
ON CONFLICT (name) DO NOTHING;

-- Si no hay ninguna cancha, insertar una por defecto
INSERT INTO public.venues (name, location) VALUES ('Losa Principal', 'Losa principal') ON CONFLICT DO NOTHING;

-- Mapear canchas existentes a ids
UPDATE public.matches m
SET venue_id = v.id
FROM public.venues v
WHERE m.court = v.name;

-- Eliminar columna antigua court
ALTER TABLE public.matches DROP COLUMN court;

-- ====================================================
-- 4. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
-- ====================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_standings ENABLE ROW LEVEL SECURITY;

-- 4.1 Políticas para: sports
CREATE POLICY "sports_select" ON public.sports FOR SELECT USING (true);
CREATE POLICY "sports_admin" ON public.sports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.2 Políticas para: competition_formats
CREATE POLICY "formats_select" ON public.competition_formats FOR SELECT USING (true);
CREATE POLICY "formats_admin" ON public.competition_formats FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.3 Políticas para: tournament_bases
CREATE POLICY "bases_select" ON public.tournament_bases FOR SELECT USING (true);
CREATE POLICY "bases_admin" ON public.tournament_bases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.4 Políticas para: venues
CREATE POLICY "venues_select" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues_admin" ON public.venues FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.5 Políticas para: venue_sports
CREATE POLICY "venue_sports_select" ON public.venue_sports FOR SELECT USING (true);
CREATE POLICY "venue_sports_admin" ON public.venue_sports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.6 Políticas para: time_slots
CREATE POLICY "time_slots_select" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "time_slots_admin" ON public.time_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.7 Políticas para: venue_availability
CREATE POLICY "venue_availability_select" ON public.venue_availability FOR SELECT USING (true);
CREATE POLICY "venue_availability_admin" ON public.venue_availability FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.8 Políticas para: groups
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (true);
CREATE POLICY "groups_admin" ON public.groups FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.9 Políticas para: group_teams
CREATE POLICY "group_teams_select" ON public.group_teams FOR SELECT USING (true);
CREATE POLICY "group_teams_admin" ON public.group_teams FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.10 Políticas para: group_standings
CREATE POLICY "group_standings_select" ON public.group_standings FOR SELECT USING (true);
CREATE POLICY "group_standings_admin" ON public.group_standings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Vincular deportes existentes a canchas existentes (seed)
INSERT INTO public.venue_sports (venue_id, sport_id)
SELECT v.id, s.id 
FROM public.venues v, public.sports s
ON CONFLICT DO NOTHING;

-- ====================================================
-- 5. FUNCIONES Y TRIGGERS (Cálculo Automático)
-- ====================================================

-- 5.1 Función: recalculate_group_standings
CREATE OR REPLACE FUNCTION public.recalculate_group_standings(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
    v_points_win integer;
    v_points_draw integer;
    v_points_loss integer;
    r record;
BEGIN
    -- Obtener configuraciones de puntos del evento
    SELECT e.id, e.points_win, e.points_draw, e.points_loss
    INTO v_event_id, v_points_win, v_points_draw, v_points_loss
    FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = p_group_id;

    -- Reiniciar standings del grupo a cero
    INSERT INTO public.group_standings (group_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
    SELECT p_group_id, gt.team_id, 0, 0, 0, 0, 0, 0, 0, 0
    FROM public.group_teams gt
    WHERE gt.group_id = p_group_id
    ON CONFLICT (group_id, team_id) DO UPDATE
    SET played = 0, won = 0, drawn = 0, lost = 0, goals_for = 0, goals_against = 0, goal_difference = 0, points = 0;

    -- Procesar partidos terminados en este grupo
    FOR r IN
        SELECT
            m.home_team_id,
            m.away_team_id,
            m.home_score,
            m.away_score
        FROM public.matches m
        WHERE m.group_id = p_group_id AND m.status = 'finished'
    LOOP
        -- Actualizar Local
        UPDATE public.group_standings
        SET
            played = played + 1,
            goals_for = goals_for + r.home_score,
            goals_against = goals_against + r.away_score,
            won = won + CASE WHEN r.home_score > r.away_score THEN 1 ELSE 0 END,
            drawn = drawn + CASE WHEN r.home_score = r.away_score THEN 1 ELSE 0 END,
            lost = lost + CASE WHEN r.home_score < r.away_score THEN 1 ELSE 0 END,
            points = points + CASE
                WHEN r.home_score > r.away_score THEN v_points_win
                WHEN r.home_score = r.away_score THEN v_points_draw
                ELSE v_points_loss
            END
        WHERE group_id = p_group_id AND team_id = r.home_team_id;

        -- Actualizar Visitante
        UPDATE public.group_standings
        SET
            played = played + 1,
            goals_for = goals_for + r.away_score,
            goals_against = goals_against + r.home_score,
            won = won + CASE WHEN r.away_score > r.home_score THEN 1 ELSE 0 END,
            drawn = drawn + CASE WHEN r.away_score = r.home_score THEN 1 ELSE 0 END,
            lost = lost + CASE WHEN r.away_score < r.home_score THEN 1 ELSE 0 END,
            points = points + CASE
                WHEN r.away_score > r.home_score THEN v_points_win
                WHEN r.away_score = r.home_score THEN v_points_draw
                ELSE v_points_loss
            END
        WHERE group_id = p_group_id AND team_id = r.away_team_id;
    END LOOP;

    -- Actualizar diferencia de goles
    UPDATE public.group_standings
    SET goal_difference = goals_for - goals_against
    WHERE group_id = p_group_id;
END;
$$;

-- 5.2 Trigger: fn_update_group_standings
CREATE OR REPLACE FUNCTION public.fn_update_group_standings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_group_id := OLD.group_id;
    ELSE
        v_group_id := NEW.group_id;
    END IF;

    IF v_group_id IS NOT NULL THEN
        PERFORM public.recalculate_group_standings(v_group_id);
    END IF;

    -- Si se cambia un partido que pertenecía a un grupo y ahora ya no, recalcular el anterior también
    IF TG_OP = 'UPDATE' AND OLD.group_id IS NOT NULL AND OLD.group_id <> COALESCE(NEW.group_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.recalculate_group_standings(OLD.group_id);
    END IF;

    RETURN NULL;
END;
$$;

-- Crear trigger en 'matches'
CREATE TRIGGER tr_update_group_standings
    AFTER INSERT OR UPDATE OR DELETE
    ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_group_standings();

-- 5.3 Trigger: fn_sync_group_teams_standings
CREATE OR REPLACE FUNCTION public.fn_sync_group_teams_standings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.group_standings (group_id, team_id)
        VALUES (NEW.group_id, NEW.team_id)
        ON CONFLICT (group_id, team_id) DO NOTHING;
        
        PERFORM public.recalculate_group_standings(NEW.group_id);
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.group_standings
        WHERE group_id = OLD.group_id AND team_id = OLD.team_id;
        
        PERFORM public.recalculate_group_standings(OLD.group_id);
    END IF;
    RETURN NULL;
END;
$$;

-- Crear trigger en 'group_teams'
CREATE TRIGGER tr_sync_group_teams_standings
    AFTER INSERT OR DELETE
    ON public.group_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_group_teams_standings();

-- ====================================================
-- 6. CREACIÓN DE ÍNDICES PARA OPTIMIZACIÓN
-- ====================================================
CREATE INDEX IF NOT EXISTS group_teams_group_id_idx ON public.group_teams(group_id);
CREATE INDEX IF NOT EXISTS group_standings_group_id_idx ON public.group_standings(group_id);
CREATE INDEX IF NOT EXISTS matches_group_id_idx ON public.matches(group_id);
CREATE INDEX IF NOT EXISTS matches_venue_id_idx ON public.matches(venue_id);
CREATE INDEX IF NOT EXISTS venue_sports_sport_id_idx ON public.venue_sports(sport_id);
CREATE INDEX IF NOT EXISTS venue_availability_time_slot_id_idx ON public.venue_availability(time_slot_id);
