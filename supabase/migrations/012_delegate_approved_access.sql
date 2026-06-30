-- Delegates can authenticate and be linked before approval, but they cannot manage
-- team data or roster rows until administration approves the team.

drop policy if exists "delegate_update_own_teams" on public.teams;
create policy "delegate_update_own_teams"
  on public.teams for update
  using (
    public.is_admin()
    or (delegate_user_id = auth.uid() and status = 'approved')
  )
  with check (
    public.is_admin()
    or (delegate_user_id = auth.uid() and status = 'approved')
  );

drop policy if exists "delegate_players_all" on public.players;
create policy "delegate_players_all"
  on public.players for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.delegate_user_id = auth.uid()
        and teams.status = 'approved'
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.delegate_user_id = auth.uid()
        and teams.status = 'approved'
    )
  );
