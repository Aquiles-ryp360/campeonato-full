create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'delegate', 'viewer');
create type public.sport_type as enum ('futsal', 'voley');
create type public.event_format as enum ('league', 'single_elimination', 'groups_then_knockout');
create type public.event_status as enum ('draft', 'registration', 'in_progress', 'finished');
create type public.payment_method as enum ('yape', 'plin');
create type public.payment_status as enum ('pending', 'verified', 'rejected');
create type public.registration_code_status as enum ('available', 'used', 'revoked');
create type public.team_status as enum ('pending_payment', 'registered', 'observed', 'approved');
create type public.match_status as enum ('scheduled', 'finished', 'walkover', 'postponed');
create type public.card_type as enum ('yellow', 'red');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sport public.sport_type not null,
  category text not null,
  format public.event_format not null default 'league',
  status public.event_status not null default 'draft',
  registration_fee numeric(10,2) not null default 40,
  registration_open_until timestamptz not null,
  max_teams integer not null default 12 check (max_teams > 1),
  min_players integer not null default 5 check (min_players > 0),
  max_players integer not null default 12 check (max_players >= min_players),
  points_win integer not null default 3,
  points_draw integer not null default 1,
  points_loss integer not null default 0,
  rules_summary text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registration_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  method public.payment_method not null,
  code text not null,
  amount numeric(10,2) not null,
  status public.registration_code_status not null default 'available',
  used_by_team_id uuid,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  delegate_user_id uuid references public.profiles(id),
  name text not null,
  delegate_name text not null,
  delegate_phone text not null,
  delegate_email text,
  primary_color text,
  secondary_color text,
  registration_code_id uuid references public.registration_codes(id),
  status public.team_status not null default 'pending_payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registration_codes
  add constraint registration_codes_used_by_team_fk
  foreign key (used_by_team_id) references public.teams(id) on delete set null;

create unique index registration_codes_single_use_idx
  on public.registration_codes (used_by_team_id)
  where used_by_team_id is not null;

create unique index teams_event_name_unique_idx
  on public.teams (event_id, lower(name));

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text not null,
  student_code text not null,
  enrollment_file text not null,
  semester text not null,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, dni)
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round integer not null default 1,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  scheduled_at timestamptz not null,
  court_id uuid references public.courts(id),
  status public.match_status not null default 'scheduled',
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table public.match_goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid references public.players(id),
  minute integer check (minute is null or minute >= 0),
  created_at timestamptz not null default now()
);

create table public.match_cards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  type public.card_type not null,
  minute integer check (minute is null or minute >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.audio_result_drafts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  audio_url text,
  transcript text not null,
  parsed_payload jsonb not null,
  confidence numeric(4,3) not null default 0,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registration_codes enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.courts enable row level security;
alter table public.matches enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.audio_result_drafts enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_or_admin_select"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "public_events_select"
  on public.events for select
  using (true);

create policy "admin_events_all"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public_approved_teams_select"
  on public.teams for select
  using (status in ('registered', 'approved') or public.is_admin() or delegate_user_id = auth.uid());

create policy "delegate_insert_teams"
  on public.teams for insert
  with check (delegate_user_id = auth.uid() or public.is_admin());

create policy "delegate_update_own_teams"
  on public.teams for update
  using (delegate_user_id = auth.uid() or public.is_admin())
  with check (delegate_user_id = auth.uid() or public.is_admin());

create policy "players_team_or_admin_select"
  on public.players for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and (teams.delegate_user_id = auth.uid() or teams.status in ('registered', 'approved'))
    )
  );

create policy "delegate_players_all"
  on public.players for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.delegate_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.delegate_user_id = auth.uid()
    )
  );

create policy "public_matches_select"
  on public.matches for select
  using (true);

create policy "public_match_details_select"
  on public.match_goals for select
  using (true);

create policy "public_match_cards_select"
  on public.match_cards for select
  using (true);

create policy "admin_competition_all_matches"
  on public.matches for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_competition_all_goals"
  on public.match_goals for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_competition_all_cards"
  on public.match_cards for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_registration_codes_all"
  on public.registration_codes for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_audio_drafts_all"
  on public.audio_result_drafts for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_audit_select"
  on public.audit_logs for select
  using (public.is_admin());

create index events_status_idx on public.events(status);
create index teams_event_id_idx on public.teams(event_id);
create index players_team_id_idx on public.players(team_id);
create index matches_event_round_idx on public.matches(event_id, round);
create index audio_result_drafts_event_id_idx on public.audio_result_drafts(event_id);
