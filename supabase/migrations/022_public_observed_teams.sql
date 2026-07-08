drop policy if exists "public_approved_teams_select" on public.teams;

create policy "public_approved_teams_select"
  on public.teams for select
  using (
    status in ('registered', 'observed', 'approved')
    or public.is_admin()
    or delegate_user_id = auth.uid()
  );

drop policy if exists "players_team_or_admin_select" on public.players;

create policy "players_team_or_admin_select"
  on public.players for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and (
          teams.delegate_user_id = auth.uid()
          or teams.status in ('registered', 'observed', 'approved')
        )
    )
  );
