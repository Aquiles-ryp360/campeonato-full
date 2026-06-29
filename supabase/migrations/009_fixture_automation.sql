-- Fixture automation metadata for generated brackets, placeholders and lifecycle states.

do $$
begin
  if exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'matches'
      and constraint_name = 'matches_stage_check'
  ) then
    alter table public.matches drop constraint matches_stage_check;
  end if;
end $$;

alter table public.events
  add column if not exists event_date timestamptz,
  add column if not exists fixture_status text not null default 'draft_auto'
    check (fixture_status in ('draft_auto', 'draft_review', 'published', 'locked')),
  add column if not exists seeding_mode text not null default 'registration_order'
    check (seeding_mode in ('random', 'registration_order', 'manual', 'ranking')),
  add column if not exists third_place boolean not null default true,
  add column if not exists allow_byes boolean not null default true,
  add column if not exists penalties_enabled boolean not null default true,
  add column if not exists fixture_compact_preview boolean not null default true,
  add column if not exists schedule_config jsonb;

alter table public.matches
  alter column home_team_id drop not null,
  alter column away_team_id drop not null,
  add column if not exists label text,
  add column if not exists home_placeholder text,
  add column if not exists away_placeholder text,
  add column if not exists home_source_match_id text,
  add column if not exists away_source_match_id text,
  add column if not exists source_match_ids text[] not null default '{}',
  add column if not exists depends_on_match_ids text[] not null default '{}',
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists fixture_status text not null default 'draft_auto'
    check (fixture_status in ('draft_auto', 'draft_review', 'published', 'locked')),
  add column if not exists is_fixture_preliminary boolean not null default true;

alter table public.matches
  add constraint matches_stage_check
  check (stage in ('group_stage', 'preliminary', 'round_of_16', 'quarter_finals', 'semi_finals', 'final', 'third_place'));

alter table public.matches
  drop constraint if exists matches_home_team_id_away_team_id_check;

alter table public.matches
  add constraint matches_known_teams_not_equal_check
  check (
    home_team_id is null
    or away_team_id is null
    or home_team_id <> away_team_id
  );

create index if not exists matches_event_stage_round_idx
  on public.matches (event_id, stage, round, bracket_position);

create index if not exists matches_fixture_status_idx
  on public.matches (fixture_status);
