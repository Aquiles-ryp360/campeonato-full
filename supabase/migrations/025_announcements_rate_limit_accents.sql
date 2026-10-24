-- Avisos del organizador para delegados inscritos.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 3 and 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_event_created_idx
  on public.announcements (event_id, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "members_announcements_select" on public.announcements;
create policy "members_announcements_select"
  on public.announcements for select
  using (public.is_member());

drop policy if exists "admin_announcements_all" on public.announcements;
create policy "admin_announcements_all"
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());

-- Intentos de validacion de codigo (limite persistente por IP).
-- Sin politicas: solo el service role del servidor puede leer/escribir.
create table if not exists public.registration_code_attempts (
  id bigserial primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists registration_code_attempts_ip_time_idx
  on public.registration_code_attempts (ip_hash, attempted_at desc);

alter table public.registration_code_attempts enable row level security;

-- Tildes en descripciones cargadas sin acentos.
update public.events
set rules_summary = regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(rules_summary, '\meliminacion\M', 'eliminación', 'g'),
            '\mEliminacion\M', 'Eliminación', 'g'),
          '\mautomatica\M', 'automática', 'g'),
        '\mclasificacion\M', 'clasificación', 'g'),
      '\minscripcion\M', 'inscripción', 'g')
where rules_summary ~ '\m(eliminacion|Eliminacion|automatica|clasificacion|inscripcion)\M';
