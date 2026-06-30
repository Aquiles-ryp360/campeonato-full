# Campeonato Carreras

V0 nueva para gestionar campeonatos de carrera con Next.js, Supabase y despliegue en Vercel.

La plantilla anterior se guardo en `referencia-1/`.

## Stack

- Next.js App Router
- Supabase Auth, Postgres, Storage y RLS
- Tailwind CSS
- Vercel

## Arranque local

```bash
npm install
npm run dev
```

Sin variables de Supabase, la app usa datos mock para poder revisar la experiencia.

## Variables

Copia `.env.example` a `.env.local` y completa:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Base de datos

La migracion inicial esta en `supabase/migrations/001_initial_schema.sql`.

Las migraciones relevantes para la version actual son:

- `012_delegate_approved_access.sql`
- `013_event_categories.sql`

## Flujo actual

- Publico: campeonato, deporte, categoria, equipos, fixture, tabla, resultados y bases.
- Delegado: se registra con su correo, elige categoria, carga jugadores y recibe acceso solo cuando el equipo queda `approved`.
- Admin: crea/edita campeonatos, administra categorias, aprueba u observa equipos y genera llaves por categoria.

## Notas tecnicas

- Las categorias se cargan desde la base de datos, no desde valores hardcodeados en el frontend.
- El acceso del delegado usa Supabase Auth y Magic Link.
- `teams.category_id` y `matches.category_id` son obligatorios en el esquema actual.
- La vista `public.championships` sigue funcionando como compatibilidad con `events`.
