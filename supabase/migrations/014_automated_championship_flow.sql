-- Automated championship flow: payments, assigned venues, referees and reviewed results.

alter type public.app_role add value if not exists 'referee';
alter type public.payment_status add value if not exists 'review';
alter type public.payment_status add value if not exists 'approved';
alter type public.match_status add value if not exists 'in_progress';
alter type public.match_status add value if not exists 'submitted';
alter type public.match_status add value if not exists 'validated';
alter type public.match_status add value if not exists 'disputed';
alter type public.match_status add value if not exists 'cancelled';

alter table public.events
  add column if not exists auto_approve_after_payment boolean not null default false,
  add column if not exists auto_validate_referee_results boolean not null default false;

alter table public.teams
  add column if not exists payment_status public.payment_status not null default 'pending';

update public.teams
set payment_status = 'approved'
where payment_status = 'pending'
  and status = 'approved';

create table if not exists public.event_venues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (event_id, venue_id)
);

insert into public.event_venues (event_id, venue_id)
select distinct e.id, v.id
from public.events e
cross join public.venues v
where exists (
  select 1
  from jsonb_array_elements_text(coalesce(e.schedule_config->'courts', '[]'::jsonb)) court(value)
  where court.value = v.id or court.value = v.name
)
on conflict do nothing;

create table if not exists public.team_payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  method public.payment_method not null,
  operation_code text,
  receipt_url text,
  payer_name text,
  status public.payment_status not null default 'review',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_payments_team_idx on public.team_payments(team_id);
create index if not exists team_payments_event_status_idx on public.team_payments(event_id, status, created_at);

create table if not exists public.referees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists referees_email_unique_idx on public.referees(lower(email));

create table if not exists public.match_referees (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete restrict,
  role text not null default 'main',
  created_at timestamptz not null default now(),
  unique (match_id, referee_id)
);

create index if not exists match_referees_referee_idx on public.match_referees(referee_id);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  submitted_by uuid references public.profiles(id),
  validated_by uuid references public.profiles(id),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  home_sets integer check (home_sets is null or home_sets >= 0),
  away_sets integer check (away_sets is null or away_sets >= 0),
  status text not null default 'submitted' check (status in ('submitted', 'validated', 'disputed')),
  observations text,
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_results_status_idx on public.match_results(status, submitted_at);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null check (event_type in ('goal', 'yellow_card', 'red_card', 'own_goal', 'penalty_goal', 'penalty_missed', 'injury', 'incident')),
  minute integer check (minute is null or minute >= 0),
  value integer,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists match_events_match_type_idx on public.match_events(match_id, event_type);
create index if not exists match_events_player_idx on public.match_events(player_id);

create table if not exists public.volleyball_sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  home_points integer not null check (home_points >= 0),
  away_points integer not null check (away_points >= 0),
  winner_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, set_number)
);

alter table public.event_venues enable row level security;
alter table public.team_payments enable row level security;
alter table public.referees enable row level security;
alter table public.match_referees enable row level security;
alter table public.match_results enable row level security;
alter table public.match_events enable row level security;
alter table public.volleyball_sets enable row level security;

create policy "event_venues_select" on public.event_venues for select using (true);
create policy "event_venues_admin" on public.event_venues for all using (public.is_admin()) with check (public.is_admin());

create policy "team_payments_admin" on public.team_payments for all using (public.is_admin()) with check (public.is_admin());
create policy "team_payments_delegate_select" on public.team_payments for select using (
  exists (
    select 1 from public.teams t
    where t.id = team_payments.team_id
      and (t.delegate_user_id = auth.uid() or lower(t.delegate_email) = lower(coalesce(auth.jwt()->>'email', '')))
  )
);

create policy "referees_admin" on public.referees for all using (public.is_admin()) with check (public.is_admin());
create policy "referees_self_select" on public.referees for select using (user_id = auth.uid() or public.is_admin());

create policy "match_referees_admin" on public.match_referees for all using (public.is_admin()) with check (public.is_admin());
create policy "match_referees_self_select" on public.match_referees for select using (
  exists (select 1 from public.referees r where r.id = match_referees.referee_id and r.user_id = auth.uid())
  or public.is_admin()
);

create policy "match_results_admin" on public.match_results for all using (public.is_admin()) with check (public.is_admin());
create policy "match_results_public_validated_select" on public.match_results for select using (status = 'validated');

create policy "match_events_public_validated_select" on public.match_events for select using (
  exists (select 1 from public.match_results r where r.match_id = match_events.match_id and r.status = 'validated')
  or public.is_admin()
);

create policy "volleyball_sets_public_validated_select" on public.volleyball_sets for select using (
  exists (select 1 from public.match_results r where r.match_id = volleyball_sets.match_id and r.status = 'validated')
  or public.is_admin()
);
