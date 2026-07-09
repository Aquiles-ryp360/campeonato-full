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
NEXT_PUBLIC_SITE_URL=
ADMIN_EMAILS=
```

## Base de datos

La migracion inicial esta en `supabase/migrations/001_initial_schema.sql`.

Para el flujo actual de arbitraje en vivo tambien deben aplicarse las migraciones en orden, incluyendo:

- `supabase/migrations/010_referee_live_module.sql`
- `supabase/migrations/011_penalty_live_flow.sql`
- `supabase/migrations/012_penalty_resolution_metadata.sql`
- `supabase/migrations/013_registration_production_hardening.sql`

La migracion `012` agrega metadatos de ganador, forma de victoria, estados publicos de resultado y campeon del evento.

La migracion `013` endurece inscripciones: agrega metadatos de revision/pago en equipos, control de cambio de camiseta en jugadores y crea el bucket privado `enrollment-files` para fichas de matricula PDF/JPG/PNG de hasta 5 MB.

Ambas migraciones deben ejecutarse en Supabase antes de desplegar el flujo nuevo en produccion.

## Flujos base

- Publico: fixture, tabla y resultados.
- Equipo: inscripcion con pago Yape/Plin, jugadores y estado.
- Admin: crear eventos, configurar formato, aprobar/observar inscripciones, cargar resultados.
- IA: audio de resultado, transcripcion, JSON revisable y boton para publicar.

## Seguridad y rutas protegidas

Con Supabase configurado, el middleware y los layouts server-side validan sesion y rol antes de renderizar paneles privados:

- `/admin/**`: requiere `admin`.
- `/delegado/**`: requiere `delegate` o `admin`.
- `/arbitro/**`: requiere `referee` o `admin`.

Los roles esperados son `admin`, `delegate`, `referee` y `viewer`. El modo local sin variables Supabase conserva el demo para desarrollo, pero produccion debe usar Supabase Auth.

## Inscripciones

Las inscripciones publicas solo se aceptan cuando el campeonato esta en estado `registration`, antes de `registration_open_until` y mientras no se haya alcanzado `max_teams` con equipos activos (`registered`, `observed`, `approved`).

Cada jugador debe cargar ficha de matricula real en Supabase Storage (`enrollment-files`) y registrar semestre/ciclo. El backend valida PDF/JPG/PNG, maximo 5 MB, duplicados por DNI y codigo dentro del equipo y contra equipos activos del mismo campeonato/categoria.

El delegado puede editar equipo y plantel solo mientras la inscripcion esta abierta y antes del inicio del evento. Despues del inicio no puede modificar el plantel; solo puede cambiar el numero de camiseta una vez por jugador, con validacion backend de rango 1-99 y sin duplicados dentro del equipo.

El admin valida pago, observa, rechaza o aprueba equipos desde el panel. La aprobacion bloquea si faltan pago validado, fichas, semestre, cupos o existen duplicados.

## Arbitraje en vivo

Ruta principal:

- `/arbitro`: lista partidos asignados al correo del arbitro.
- `/arbitro/partidos/[id]/live`: permite iniciar partido, registrar goles, tarjetas, penales, anular ultimo evento propio, enviar resultado y ver marcador en vivo.

Para grabar o practicar el flujo completo con el campeonato de capacitacion, usa `docs/guia-grabacion-capacitacion-arbitros.md`.

Solo el arbitro asignado al partido, o un admin, puede editar el partido. La validacion se hace en servidor antes de cada accion.

El resultado cargado por el arbitro se publica inmediatamente como oficial. Cuando el arbitro presiona `Enviar resultado` o finaliza una tanda de penales:

- se guarda el marcador final y los eventos del partido;
- se actualizan marcador publico, tabla, tarjetas, suspensiones y estadisticas derivadas;
- se actualiza el diagrama de llaves;
- el ganador avanza inmediatamente si hay siguiente fase;
- si el partido es final, se declara campeon inmediatamente;
- el estado visible queda como `Resultado oficial` / `Resultado cargado por arbitro`.

El admin no aprueba antes de publicar. Solo interviene despues si existe controversia, reclamo, observacion o correccion posterior.

Estados relevantes:

- `referee_submitted`: resultado oficial cargado por arbitro y visible publicamente.
- `under_review`: resultado visible, marcado en revision por controversia.
- `corrected`: resultado corregido por admin/editor.
- `validated`: resultado confirmado definitivamente si se usa esa instancia.
- `disputed`: resultado observado.
- `cancelled`: partido cancelado.

## APIs disponibles

- `GET /api/teams`: lista equipos publicos; acepta `championship`, `championshipId`, `eventId`, `sport` y `category`.
- `GET /api/matches`: lista partidos; acepta los mismos filtros por campeonato/deporte/categoria.
- `GET /api/referee/matches`: lista partidos asignados al arbitro autenticado.
- `GET /api/admin/results/pending`: lista resultados enviados/en revision para admin.
- `POST /api/referee/matches/[id]/live`: acciones de arbitraje en vivo.
- `POST /api/admin/matches/[id]/result`: revision, correccion de marcador y anulacion/restauracion de eventos.

## Correcciones admin

`/admin/resultados` permite revisar y corregir:

- marcador reglamentario y penales;
- goles, autogoles y goles de penal;
- tarjetas amarillas y rojas;
- penales de definicion;
- eventos anulados/restaurados;
- auditoria reciente desde `audit_logs`.

Cada correccion critica inserta un registro en `audit_logs` y una observacion en el historial del partido.

## Produccion

El repositorio incluye CI en GitHub Actions, `.nvmrc`, `.editorconfig`, `.prettierrc` y headers de seguridad razonables en `next.config.mjs`.

## Pendientes reales

- Ejecutar todas las migraciones pendientes en Supabase de produccion.
- Revisar politicas RLS despues de poblar usuarios reales y correos admin.
- Sustituir credenciales demo/localStorage por cuentas Supabase en cualquier ambiente publico.
- Ampliar auditoria con diffs visuales mas detallados si el comite necesita trazabilidad legal fina.
