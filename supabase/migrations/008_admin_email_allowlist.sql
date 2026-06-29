create table if not exists public.admin_emails (
  email text primary key,
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_emails_normalized_email_check check (email = lower(trim(email)))
);

alter table public.admin_emails enable row level security;

drop policy if exists "admin_emails_admin_all" on public.admin_emails;
create policy "admin_emails_admin_all"
  on public.admin_emails for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.admin_emails (email, full_name)
values
  ('ryp360@gmail.com', 'Administrador'),
  ('renzomamanigalindo@gmail.com', 'Renzo Mamani Galindo')
on conflict (email) do update
set
  full_name = excluded.full_name,
  active = true,
  updated_at = now();
