-- Informacion del campeonato solo para participantes (delegado, arbitro, admin).
-- El publico conserva lectura de events, sports, competition_formats y time_slots
-- (necesarios para la portada de inscripcion). El servidor lee con service role.

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'delegate', 'referee')
  );
$$;

-- Equipos: miembros ven equipos activos; cada delegado siempre ve el suyo.
drop policy if exists "public_approved_teams_select" on public.teams;
drop policy if exists "members_teams_select" on public.teams;
create policy "members_teams_select"
  on public.teams for select
  using (
    public.is_admin()
    or delegate_user_id = auth.uid()
    or (public.is_member() and status in ('registered', 'observed', 'approved'))
  );

-- Jugadores (incluye DNI): solo admin, el delegado del equipo y arbitros.
drop policy if exists "players_team_or_admin_select" on public.players;
create policy "players_team_or_admin_select"
  on public.players for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'referee'
    )
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.delegate_user_id = auth.uid()
    )
  );

-- Partidos y detalle.
drop policy if exists "public_matches_select" on public.matches;
create policy "public_matches_select"
  on public.matches for select
  using (public.is_member());

drop policy if exists "public_match_details_select" on public.match_goals;
create policy "public_match_details_select"
  on public.match_goals for select
  using (public.is_member());

drop policy if exists "public_match_cards_select" on public.match_cards;
create policy "public_match_cards_select"
  on public.match_cards for select
  using (public.is_member());

drop policy if exists "public_match_live_events_select" on public.match_live_events;
create policy "public_match_live_events_select"
  on public.match_live_events for select
  using (
    public.is_admin()
    or public.is_match_referee(match_id)
    or public.is_member()
  );

-- Grupos, posiciones, bases y sedes.
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups for select using (public.is_member());

drop policy if exists "group_teams_select" on public.group_teams;
create policy "group_teams_select" on public.group_teams for select using (public.is_member());

drop policy if exists "group_standings_select" on public.group_standings;
create policy "group_standings_select" on public.group_standings for select using (public.is_member());

drop policy if exists "bases_select" on public.tournament_bases;
create policy "bases_select" on public.tournament_bases for select using (public.is_member());

drop policy if exists "venues_select" on public.venues;
create policy "venues_select" on public.venues for select using (public.is_member());

drop policy if exists "venue_sports_select" on public.venue_sports;
create policy "venue_sports_select" on public.venue_sports for select using (public.is_member());

drop policy if exists "venue_availability_select" on public.venue_availability;
create policy "venue_availability_select" on public.venue_availability for select using (public.is_member());
