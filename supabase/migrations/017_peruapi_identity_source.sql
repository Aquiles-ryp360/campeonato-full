do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'players_identity_source_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      drop constraint players_identity_source_check;
  end if;

  alter table public.players
    add constraint players_identity_source_check
    check (identity_source in ('manual', 'unap_tramites', 'dni_provider', 'unap_docentes', 'peruapi'));
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'identity_lookup_cache_source_check'
      and conrelid = 'public.identity_lookup_cache'::regclass
  ) then
    alter table public.identity_lookup_cache
      drop constraint identity_lookup_cache_source_check;
  end if;

  alter table public.identity_lookup_cache
    add constraint identity_lookup_cache_source_check
    check (source in ('unap_tramites', 'dni_provider', 'unap_docentes', 'peruapi'));
end $$;
