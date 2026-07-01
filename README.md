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

Para el flujo actual de arbitraje en vivo tambien debe aplicarse:

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

## Inscripciones

Las inscripciones publicas solo se aceptan cuando el campeonato esta en estado `registration`, antes de `registration_open_until` y mientras no se haya alcanzado `max_teams` con equipos activos (`registered`, `observed`, `approved`).

Cada jugador debe cargar ficha de matricula real en Supabase Storage (`enrollment-files`) y registrar semestre/ciclo. El backend valida PDF/JPG/PNG, maximo 5 MB, duplicados por DNI y codigo dentro del equipo y contra equipos activos del mismo campeonato/categoria.

El delegado puede editar equipo y plantel solo mientras la inscripcion esta abierta y antes del inicio del evento. Despues del inicio no puede modificar el plantel; solo puede cambiar el numero de camiseta una vez por jugador, con validacion backend de rango 1-99 y sin duplicados dentro del equipo.

El admin valida pago, observa, rechaza o aprueba equipos desde el panel. La aprobacion bloquea si faltan pago validado, fichas, semestre, cupos o existen duplicados.

## Arbitraje en vivo

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

## Correcciones pendientes

Pendiente implementar UI admin granular para corregir eventos del partido:

- goleadores;
- tarjetas;
- penales;
- eventos anulados;
- auditoria visible de correcciones.
