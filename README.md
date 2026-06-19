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

## Flujos base

- Publico: fixture, tabla y resultados.
- Equipo: inscripcion con pago Yape/Plin, jugadores y estado.
- Admin: crear eventos, configurar formato, aprobar/observar inscripciones, cargar resultados.
- IA: audio de resultado, transcripcion, JSON revisable y boton para publicar.
