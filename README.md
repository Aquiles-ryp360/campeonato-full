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
- `014_automated_championship_flow.sql`

Aplicacion en Supabase:

```bash
supabase db push
```

En staging/produccion, aplicar primero las migraciones y luego desplegar la app. `014_automated_championship_flow.sql` agrega pagos, arbitros, resultados revisables, sets de voley, eventos de partido, `event_venues`, `teams.payment_status`, rol `referee`, `auto_approve_after_payment` y `auto_validate_referee_results`.

## Flujo actual

- Publico: campeonato, deporte, categoria, equipos, programacion, tabla, resultados validados y bases.
- Inscripcion: el delegado registra equipo, categoria, jugadores, metodo de pago, codigo de operacion, comprobante y responsable.
- Pagos: el equipo nace `registered` y el pago queda `pending` o `review`; el admin valida en `/admin/pagos`.
- Aprobacion: un equipo solo pasa a `approved` con `payment_status = approved` y reglas deportivas cumplidas. Si `auto_approve_after_payment` esta activo, la aprobacion ocurre al aprobar el pago.
- Programacion automatica: el admin genera partidos por campeonato, deporte, categoria, canchas asignadas en `event_venues`, horarios activos y equipos aprobados con pago aprobado.
- Arbitros: el admin gestiona arbitros en `/admin/arbitros` y los asigna desde `/admin/fixture`.
- Resultados: el arbitro entra a `/arbitro`, ve solo sus partidos asignados, inicia partido y envia resultado con goles/tarjetas o sets. El resultado queda `submitted` o `validated` segun `auto_validate_referee_results`.
- Estadisticas: tablas publicas calculan solo partidos `validated` (y `finished` legacy). Resultados internos `submitted` o `disputed` no se muestran al publico.

## Notas tecnicas

- Las categorias se cargan desde la base de datos, no desde valores hardcodeados en el frontend.
- El acceso del delegado usa Supabase Auth y Magic Link.
- El acceso del arbitro usa Supabase Auth, `profiles.role = referee`, `referees.active` y asignacion en `match_referees`.
- `teams.category_id` y `matches.category_id` son obligatorios en el esquema actual.
- La vista `public.championships` sigue funcionando como compatibilidad con `events`.
- `SERVICE_ROLE_KEY` solo se usa en rutas de servidor; no se expone al cliente.

## Pendientes reales

- Aplicar migraciones nuevas en Supabase staging/produccion.
- Asociar usuarios Supabase Auth reales a arbitros existentes.
- Endurecer RLS de datos publicos si se decide ocultar equipos no aprobados a nivel SQL y no solo por APIs/vistas.
- Ampliar formularios deportivos si se necesitan multiples goles/tarjetas por carga en una sola pantalla.
