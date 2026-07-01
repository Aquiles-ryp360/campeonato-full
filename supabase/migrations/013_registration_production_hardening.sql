-- Production hardening for public registrations, delegate edits and team review.

alter type public.team_status add value if not exists 'rejected';

alter table public.teams
  add column if not exists admin_observation text,
  add column if not exists payment_validated_at timestamptz,
  add column if not exists payment_validated_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists observed_at timestamptz,
  add column if not exists observed_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null;

alter table public.players
  add column if not exists position text,
  add column if not exists jersey_number_change_count integer not null default 0,
  add column if not exists jersey_number_changed_at timestamptz,
  add column if not exists jersey_number_changed_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_jersey_number_change_count_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_jersey_number_change_count_check
      check (jersey_number_change_count >= 0);
  end if;
end $$;

create index if not exists teams_event_status_review_idx
  on public.teams (event_id, status);

create index if not exists teams_payment_validated_idx
  on public.teams (payment_validated_at)
  where payment_validated_at is not null;

create index if not exists players_team_student_code_idx
  on public.players (team_id, lower(student_code));

create index if not exists players_team_jersey_number_idx
  on public.players (team_id, jersey_number)
  where jersey_number is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'enrollment-files',
  'enrollment-files',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[];
