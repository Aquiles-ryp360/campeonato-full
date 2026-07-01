-- Metadata for definitive knockout resolution and champion declaration.

alter table public.matches
  add column if not exists win_method text;

alter table public.matches
  drop constraint if exists matches_live_status_check;

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
      'referee_submitted',
      'submitted',
      'validated',
      'under_review',
      'corrected',
      'disputed',
      'cancelled'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_win_method_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_win_method_check
      check (
        win_method is null
        or win_method in ('regulation', 'penalties', 'walkover')
      );
  end if;
end $$;

alter table public.events
  add column if not exists champion_team_id uuid references public.teams(id) on delete set null,
  add column if not exists champion_match_id uuid references public.matches(id) on delete set null,
  add column if not exists champion_decided_at timestamptz;
