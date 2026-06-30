-- Categories are first-class entities per championship.

create or replace function public.slugify_text(value text)
returns text
language sql
immutable
as $$
  select nullif(trim(
    both '-'
    from regexp_replace(
      translate(lower(coalesce(value, '')), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun'),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  ), '');
$$;

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  published boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slug)
);

alter table public.event_categories enable row level security;

create policy "public_event_categories_select"
  on public.event_categories for select
  using (true);

create policy "admin_event_categories_all"
  on public.event_categories for all
  using (public.is_admin())
  with check (public.is_admin());

create unique index if not exists event_categories_event_name_unique_idx
  on public.event_categories (event_id, lower(name));

insert into public.event_categories (event_id, name, slug, description, published, active, sort_order)
select
  e.id,
  coalesce(nullif(btrim(e.category), ''), 'General'),
  coalesce(nullif(public.slugify_text(coalesce(nullif(btrim(e.category), ''), 'General')), ''), e.slug, 'general'),
  '',
  true,
  true,
  1
from public.events e
on conflict (event_id, slug) do nothing;

update public.events e
set category = c.name,
    updated_at = now()
from lateral (
  select ec.name
  from public.event_categories ec
  where ec.event_id = e.id
  order by ec.sort_order asc, ec.created_at asc
  limit 1
) c
where e.category is distinct from c.name;

alter table public.teams
  add column if not exists category_id uuid;

alter table public.matches
  add column if not exists category_id uuid;

update public.teams t
set category_id = ec.id,
    updated_at = now()
from public.events e
join public.event_categories ec
  on ec.event_id = e.id
 and ec.name = coalesce(nullif(btrim(e.category), ''), ec.name)
where t.event_id = e.id
  and t.category_id is null;

update public.matches m
set category_id = coalesce(t.category_id, ec.id),
    updated_at = now()
from public.teams t
left join public.events e on e.id = t.event_id
left join public.event_categories ec on ec.event_id = e.id and ec.name = coalesce(nullif(btrim(e.category), ''), ec.name)
where m.home_team_id = t.id
  and m.category_id is null;

update public.matches m
set category_id = coalesce(m.category_id, t.category_id)
from public.teams t
where m.away_team_id = t.id
  and m.category_id is null;

alter table public.teams
  alter column category_id set not null;

alter table public.matches
  alter column category_id set not null;

alter table public.teams
  add constraint teams_category_fk
  foreign key (category_id) references public.event_categories(id) on delete restrict;

alter table public.matches
  add constraint matches_category_fk
  foreign key (category_id) references public.event_categories(id) on delete restrict;

create index if not exists event_categories_event_id_idx on public.event_categories(event_id);
create index if not exists event_categories_event_active_idx on public.event_categories(event_id, active, published, sort_order);
create index if not exists teams_category_id_idx on public.teams(category_id);
create index if not exists matches_category_id_idx on public.matches(category_id);
