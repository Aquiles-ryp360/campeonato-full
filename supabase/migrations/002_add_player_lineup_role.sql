alter table public.players
  add column lineup_role text not null default 'starter'
  check (lineup_role in ('starter', 'substitute'));
