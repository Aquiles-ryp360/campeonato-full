alter table public.players
  add column if not exists document_type text not null default 'MANUAL',
  add column if not exists dni_masked text,
  add column if not exists codigo_carrera text,
  add column if not exists escuela text,
  add column if not exists identity_source text not null default 'manual',
  add column if not exists identity_verified_at timestamptz,
  add column if not exists data_consent_accepted_at timestamptz,
  add column if not exists data_consent_text_version text,
  add column if not exists registered_by_delegate_id uuid references public.profiles(id) on delete set null,
  add column if not exists verification_status text not null default 'unverified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_document_type_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_document_type_check
      check (document_type in ('DNI', 'UNAP_CODE', 'MANUAL'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'players_identity_source_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_identity_source_check
      check (identity_source in ('manual', 'unap_tramites', 'dni_provider'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'players_verification_status_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_verification_status_check
      check (verification_status in ('unverified', 'auto_filled', 'confirmed', 'manual_review'));
  end if;
end $$;

create index if not exists players_identity_source_idx
  on public.players (identity_source);

create index if not exists players_codigo_carrera_idx
  on public.players (codigo_carrera)
  where codigo_carrera is not null;

create table if not exists public.identity_lookup_cache (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('unap_tramites', 'dni_provider')),
  lookup_key text not null,
  response_json jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, lookup_key)
);

alter table public.identity_lookup_cache enable row level security;

create index if not exists identity_lookup_cache_expires_at_idx
  on public.identity_lookup_cache (expires_at);
