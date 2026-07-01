-- Referee live module: assignments, live match lifecycle and auditable events.

alter type public.app_role add value if not exists 'referee';

alter table public.events
  add column if not exists public_live_scores boolean not null default true;

alter table public.players
  add column if not exists jersey_number integer check (jersey_number is null or jersey_number > 0);

alter table public.matches
  add column if not exists live_status text not null default 'scheduled',
  add column if not exists actual_started_at timestamptz,
  add column if not exists first_half_started_at timestamptz,
  add column if not exists first_half_ended_at timestamptz,
  add column if not exists halftime_started_at timestamptz,
  add column if not exists second_half_started_at timestamptz,
  add column if not exists second_half_ended_at timestamptz,
  add column if not exists actual_finished_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists penalty_home_score integer not null default 0 check (penalty_home_score >= 0),
  add column if not exists penalty_away_score integer not null default 0 check (penalty_away_score >= 0),
  add column if not exists winner_team_id uuid references public.teams(id),
  add column if not exists referee_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_live_status_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_live_status_check
      check (
        live_status in (
          'scheduled',
          'in_progress_first_half',
          'halftime',
          'in_progress_second_half',
          'pending_tiebreak',
          'penalties',
          'submitted',
          'validated',
          'under_review',
          'disputed',
          'cancelled'
        )
      );
  end if;
end $$;

create table if not exists public.referee_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  referee_user_id uuid references public.profiles(id) on delete set null,
  referee_email text not null,
  referee_name text,
  active boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, referee_email)
);

create unique index if not exists referee_assignments_one_active_per_match_idx
  on public.referee_assignments (match_id)
  where active;

create index if not exists referee_assignments_email_idx
  on public.referee_assignments (lower(referee_email))
  where active;

create table if not exists public.match_live_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  jersey_number integer,
  event_type text not null,
  period text not null default 'pre_match',
  minute integer not null default 0 check (minute >= 0),
  score_home integer check (score_home is null or score_home >= 0),
  score_away integer check (score_away is null or score_away >= 0),
  penalty_order integer check (penalty_order is null or penalty_order > 0),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  corrected_at timestamptz,
  corrected_by uuid references public.profiles(id),
  correction_reason text
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_live_events_event_type_check'
      and conrelid = 'public.match_live_events'::regclass
  ) then
    alter table public.match_live_events
      add constraint match_live_events_event_type_check
      check (
        event_type in (
          'match_started',
          'first_half_finished',
          'second_half_started',
          'match_finished',
          'result_submitted',
          'goal',
          'own_goal',
          'penalty_goal',
          'penalty_missed',
          'yellow_card',
          'red_card',
          'foul',
          'injury',
          'observation',
          'penalty_scored',
          'penalty_missed_tiebreak'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_live_events_period_check'
      and conrelid = 'public.match_live_events'::regclass
  ) then
    alter table public.match_live_events
      add constraint match_live_events_period_check
      check (
        period in (
          'pre_match',
          'first_half',
          'halftime',
          'second_half',
          'penalties',
          'post_match'
        )
      );
  end if;
end $$;

create index if not exists match_live_events_match_created_idx
  on public.match_live_events (match_id, created_at desc);

create index if not exists match_live_events_player_idx
  on public.match_live_events (player_id)
  where player_id is not null;

create table if not exists public.player_suspensions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  source_match_id uuid references public.matches(id) on delete set null,
  reason text not null,
  matches_remaining integer not null default 1 check (matches_remaining >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_suspensions_active_player_idx
  on public.player_suspensions (player_id)
  where active and matches_remaining > 0;

create or replace function public.is_match_referee(match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.referee_assignments assignment
    where assignment.match_id = is_match_referee.match_id
      and assignment.active
      and (
        assignment.referee_user_id = auth.uid()
        or lower(assignment.referee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

alter table public.referee_assignments enable row level security;
alter table public.match_live_events enable row level security;
alter table public.player_suspensions enable row level security;

drop policy if exists "admin_referee_assignments_all" on public.referee_assignments;
create policy "admin_referee_assignments_all"
  on public.referee_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "assigned_referee_assignments_select" on public.referee_assignments;
create policy "assigned_referee_assignments_select"
  on public.referee_assignments for select
  using (
    public.is_admin()
    or referee_user_id = auth.uid()
    or lower(referee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "public_match_live_events_select" on public.match_live_events;
create policy "public_match_live_events_select"
  on public.match_live_events for select
  using (
    public.is_admin()
    or public.is_match_referee(match_id)
    or exists (
      select 1
      from public.matches m
      join public.events e on e.id = m.event_id
      where m.id = match_live_events.match_id
        and e.public_live_scores
    )
  );

drop policy if exists "admin_match_live_events_all" on public.match_live_events;
create policy "admin_match_live_events_all"
  on public.match_live_events for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "assigned_referee_match_live_events_insert" on public.match_live_events;
create policy "assigned_referee_match_live_events_insert"
  on public.match_live_events for insert
  with check (public.is_match_referee(match_id));

drop policy if exists "assigned_referee_match_live_events_update" on public.match_live_events;
create policy "assigned_referee_match_live_events_update"
  on public.match_live_events for update
  using (public.is_match_referee(match_id))
  with check (public.is_match_referee(match_id));

drop policy if exists "admin_player_suspensions_all" on public.player_suspensions;
create policy "admin_player_suspensions_all"
  on public.player_suspensions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "assigned_referee_player_suspensions_select" on public.player_suspensions;
create policy "assigned_referee_player_suspensions_select"
  on public.player_suspensions for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.event_id = player_suspensions.event_id
        and (m.home_team_id = player_suspensions.team_id or m.away_team_id = player_suspensions.team_id)
        and public.is_match_referee(m.id)
    )
  );
