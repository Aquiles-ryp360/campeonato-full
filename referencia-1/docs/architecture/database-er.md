# Diagrama Entidad-Relación

> **Versión:** 1.0.0  
> **Motor:** PostgreSQL 16+  
> **ORM:** Prisma 5+

---

## 1. Diagrama ER (ASCII)

```
┌──────────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│      User        │       │    RefreshToken       │       │   AuditLog       │
├──────────────────┤       ├──────────────────────┤       ├───────────────────┤
│ id (PK)          │──┐    │ id (PK)              │       │ id (PK)          │
│ email (UQ)       │  │    │ token (UQ)           │──┐    │ entityType       │
│ password         │  │    │ userId (FK)          │  │    │ entityId         │
│ nombre           │  │    │ expiresAt            │  │    │ action           │
│ apellido         │  │    │ revoked              │  │    │ userId (FK)      │
│ rol (enum)       │  │    │ createdAt            │  │    │ oldValue (JSON)  │
│ telefono         │  │    └──────────────────────┘  │    │ newValue (JSON)  │
│ activo           │  │                              │    │ createdAt        │
│ fotoUrl          │  │                              │    └───────────────────┘
│ createdAt        │  │                              │
│ updatedAt        │  │                              │
└──────────────────┘  │                              │
                      │                              │
┌──────────────────┐  │                              │
│  Campeonato      │  │                              │
├──────────────────┤  │                              │
│ id (PK)          │  │                              │
│ nombre           │  │                              │
│ descripcion      │  │                              │
│ logoUrl          │  │                              │
│ tipo             │  │                              │
│ estado (enum)    │  │                              │
│ createdById (FK) │──┘                              │
│ createdAt        │                                 │
│ updatedAt        │                                 │
└──────┬───────────┘                                 │
       │                                              │
       │ 1                                            │
       │                                              │
       ▼ N                                            │
┌──────────────────┐       ┌──────────────────────┐   │
│   Categoria      │       │     Temporada        │   │
├──────────────────┤       ├──────────────────────┤   │
│ id (PK)          │       │ id (PK)              │   │
│ nombre           │       │ campeonatoId (FK)    │   │
│ descripcion      │       │ categoriaId (FK)     │───┘
│ campeonatoId (FK)│──┐    │ nombre               │
│ createdAt        │  │    │ fechaInicio          │
│ updatedAt        │  │    │ fechaFin             │
└──────────────────┘  │    │ estado (enum)        │
                      │    │ createdById (FK)     │
                      │    │ createdAt            │
                      │    │ updatedAt            │
                      │    └──────────┬───────────┘
                      │               │
                      │               │ 1
                      │               │
                      │               ▼ N
                      │    ┌──────────────────────┐       ┌───────────────────┐
                      │    │       Equipo         │       │     Cancha        │
                      │    ├──────────────────────┤       ├───────────────────┤
                      │    │ id (PK)              │       │ id (PK)           │
                      │    │ nombre               │       │ nombre            │
                      │    │ escudoUrl            │       │ direccion         │
                      │    │ colorPrincipal       │       │ ciudad            │
                      │    │ colorSecundario      │       │ capacidad         │
                      │    │ temporadaId (FK)     │       │ iluminacion       │
                      │    │ categoriaId (FK)     │       │ cesped            │
                      │    │ createdById (FK)     │       │ campeonatoId (FK) │
                      │    │ createdAt            │       │ createdAt         │
                      │    │ updatedAt            │       │ updatedAt         │
                      │    └──────┬───────────────┘       └───────────────────┘
                      │           │
                      │           │ 1
                      │           │
                      │           ▼ N
                      │    ┌──────────────────────┐
                      │    │      Jugador         │
                      │    ├──────────────────────┤
                      │    │ id (PK)              │
                      │    │ nombre               │
                      │    │ apellido             │
                      │    │ dni (UQ)             │
                      │    │ fechaNacimiento      │
                      │    │ telefono             │
                      │    │ email                │
                      │    │ fotoUrl              │
                      │    │ equipoId (FK)        │
                      │    │ camisetaNumero       │
                      │    │ posicion             │
                      │    │ activo               │
                      │    │ createdAt            │
                      │    │ updatedAt            │
                      │    └──────────────────────┘
                      │
┌──────────────────┐  │
│  Delegate        │  │
├──────────────────┤  │
│ id (PK)          │  │
│ equipoId (FK)    │──┘
│ userId (FK)      │──┐
│ cargo             │  │
│ principal (bool)  │  │
│ createdAt        │  │
└──────────────────┘  │
                      │
┌──────────────────┐  │
│   Referee        │  │
├──────────────────┤  │
│ id (PK)          │  │
│ userId (FK)      │──┘
│ licencia         │
│ especialidad     │
│ createdAt        │
└──────────────────┘
                      ┌──────────────────────┐
                      │      Fixture         │
                  ┌───┤                      │
                  │   │ id (PK)              │
                  │   │ temporadaId (FK)     │
                  │   │ tipoFixture (enum)   │
                  │   │ nombre               │
                  │   │ fechaInicio          │
                  │   │ fechaFin             │
                  │   │ estado (enum)        │
                  │   │ config (JSON)        │
                  │   │ createdById (FK)     │
                  │   │ createdAt            │
                  │   │ updatedAt            │
                  │   └──────────┬───────────┘
                  │              │
                  │              │ 1
                  │              │
                  │              ▼ N
                  │   ┌──────────────────────┐
                  │   │      Partido         │
┌──────────────────┐  │                      │
│  StandingsEntry  │  │ id (PK)              │
├──────────────────┤  │ fixtureId (FK)       │
│ id (PK)          │  │ jornada              │
│ temporadaId (FK) │  │ fecha                │
│ equipoId (FK)    │  │ hora                 │
│ categoriaId (FK) │  │ canchaId (FK)        │
│ PJ (int)         │  │ equipoLocalId (FK)   │
│ PG (int)         │  │ equipoVisitanteId(FK)│
│ PE (int)         │  │ golesLocal           │
│ PP (int)         │  │ golesVisitante       │
│ GF (int)         │  │ estado (enum)        │
│ GC (int)         │  │ refereeId (FK)       │
│ DG (int)         │  │ observaciones        │
│ puntos (int)     │  │ createdAt            │
│ createdAt        │  │ updatedAt            │
│ updatedAt        │  └──────┬───────────────┘
└──────────────────┘         │
                             │ 1
                             │
                             ▼ N
                  ┌──────────────────────┐
                  │      Tarjeta         │
                  ├──────────────────────┤
                  │ id (PK)              │
                  │ partidoId (FK)       │
                  │ jugadorId (FK)       │
                  │ equipoId (FK)        │
                  │ tipo (enum)          │  (AMARILLA / ROJA)
                  │ minuto               │
                  │ motivo               │
                  │ createdAt            │
                  └──────────────────────┘
                             │
                             │
                             ▼
                  ┌──────────────────────┐
                  │      Sancion         │
                  ├──────────────────────┤
                  │ id (PK)              │
                  │ tarjetaId (FK)       │
                  │ jugadorId (FK)       │
                  │ partidoId (FK)       │
                  │ tipoSancion (enum)   │
                  │ fechaInicio          │
                  │ fechaFin             │
                  │ partidosSuspension   │
                  │ motivo               │
                  │ aplicadaPorId (FK)   │
                  │ activa               │
                  │ createdAt            │
                  │ updatedAt            │
                  └──────────────────────┘

┌──────────────────┐
│     Carnet       │
├──────────────────┤
│ id (PK)          │
│ jugadorId (FK)   │
│ equipoId (FK)    │
│ temporadaId (FK) │
│ codigoQR (UQ)    │
│ fechaEmision     │
│ fechaVencimiento │
│ estado (enum)    │
│ metadata (JSON)  │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

---

## 2. Definiciones Detalladas de Entidades

### 2.1 User

Representa un usuario del sistema con acceso a la plataforma.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | - | Email de inicio de sesión |
| `password` | `VARCHAR(255)` | `NOT NULL` | - | Hash bcrypt de la contraseña |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | - | Nombre del usuario |
| `apellido` | `VARCHAR(100)` | `NOT NULL` | - | Apellido del usuario |
| `rol` | `UserRol` (enum) | `NOT NULL` | `'VIEWER'` | Rol en el sistema |
| `telefono` | `VARCHAR(20)` | `NULLABLE` | - | Teléfono de contacto |
| `activo` | `BOOLEAN` | `NOT NULL` | `true` | Estado del usuario |
| `fotoUrl` | `VARCHAR(500)` | `NULLABLE` | - | URL de la foto de perfil |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de creación |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de actualización |

**Enum UserRol:** `SUPER_ADMIN`, `ADMIN`, `DELEGATE`, `REFEREE`, `VIEWER`

**Índices:**
- `PK` → `id`
- `UQ` → `email`

**Relaciones:**
- 1 → N con `RefreshToken`
- 1 → N con `AuditLog`
- 1 → N con `Campeonato` (createdBy)
- 1 → 1 con `Delegate`
- 1 → 1 con `Referee`

---

### 2.2 RefreshToken

Token de actualización para renovar access tokens JWT.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `token` | `TEXT` | `NOT NULL, UNIQUE` | - | Token encriptado |
| `userId` | `UUID` | `FK → User.id, NOT NULL` | - | Propietario del token |
| `expiresAt` | `TIMESTAMPTZ` | `NOT NULL` | - | Fecha de expiración |
| `revoked` | `BOOLEAN` | `NOT NULL` | `false` | Si fue revocado |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de creación |

**Índices:**
- `PK` → `id`
- `UQ` → `token`
- `INDEX` → `userId`
- `INDEX` → `expiresAt`

**Relaciones:**
- N → 1 con `User`

---

### 2.3 Campeonato

Representa un torneo o campeonato de fútbol.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `nombre` | `VARCHAR(200)` | `NOT NULL` | - | Nombre del campeonato |
| `descripcion` | `TEXT` | `NULLABLE` | - | Descripción detallada |
| `logoUrl` | `VARCHAR(500)` | `NULLABLE` | - | URL del logo |
| `tipo` | `TipoCampeonato` (enum) | `NOT NULL` | - | Tipo de campeonato |
| `estado` | `EstadoCampeonato` (enum) | `NOT NULL` | `'BORRADOR'` | Estado actual |
| `createdById` | `UUID` | `FK → User.id, NOT NULL` | - | Usuario creador |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de creación |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de actualización |

**Enum TipoCampeonato:** `LIGA`, `COPA`, `LIGUILLA`, `TORNEO`, `AMISTOSO`

**Enum EstadoCampeonato:** `BORRADOR`, `INSCRIPCION`, `EN_CURSO`, `FINALIZADO`, `CANCELADO`

**Índices:**
- `PK` → `id`
- `INDEX` → `estado`
- `INDEX` → `createdById`

**Relaciones:**
- 1 → N con `Categoria`
- 1 → N con `Cancha`
- N → 1 con `User` (createdBy)

---

### 2.4 Categoria

Categoría dentro de un campeonato (e.g., "Libre", "+40", "Femenil").

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | - | Nombre de la categoría |
| `descripcion` | `TEXT` | `NULLABLE` | - | Descripción |
| `campeonatoId` | `UUID` | `FK → Campeonato.id, NOT NULL` | - | Campeonato al que pertenece |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de creación |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de actualización |

**Índices:**
- `PK` → `id`
- `INDEX` → `campeonatoId`
- `UQ` → `(campeonatoId, nombre)`

**Relaciones:**
- N → 1 con `Campeonato`
- 1 → N con `Temporada`
- 1 → N con `StandingsEntry`

---

### 2.5 Temporada

Edición específica de una categoría en un período de tiempo.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `campeonatoId` | `UUID` | `FK → Campeonato.id, NOT NULL` | - | Campeonato |
| `categoriaId` | `UUID` | `FK → Categoria.id, NOT NULL` | - | Categoría |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | - | Ej: "Temporada 2026" |
| `fechaInicio` | `DATE` | `NOT NULL` | - | Fecha de inicio |
| `fechaFin` | `DATE` | `NULLABLE` | - | Fecha de finalización |
| `estado` | `EstadoTemporada` (enum) | `NOT NULL` | `'PROXIMA'` | Estado |
| `createdById` | `UUID` | `FK → User.id, NOT NULL` | - | Creador |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum EstadoTemporada:** `PROXIMA`, `INSCRIPCION`, `ACTIVA`, `FINALIZADA`, `CANCELADA`

**Índices:**
- `PK` → `id`
- `INDEX` → `(campeonatoId, categoriaId)`
- `INDEX` → `estado`

**Relaciones:**
- N → 1 con `Campeonato`
- N → 1 con `Categoria`
- 1 → N con `Equipo`
- 1 → N con `Fixture`
- 1 → N con `StandingsEntry`
- 1 → N con `Carnet`

---

### 2.6 Equipo

Equipo participante en una temporada de una categoría.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | - | Nombre del equipo |
| `escudoUrl` | `VARCHAR(500)` | `NULLABLE` | - | URL del escudo |
| `colorPrincipal` | `VARCHAR(7)` | `NULLABLE` | - | Color HEX primario |
| `colorSecundario` | `VARCHAR(7)` | `NULLABLE` | - | Color HEX secundario |
| `temporadaId` | `UUID` | `FK → Temporada.id, NOT NULL` | - | Temporada |
| `categoriaId` | `UUID` | `FK → Categoria.id, NOT NULL` | - | Categoría |
| `createdById` | `UUID` | `FK → User.id, NOT NULL` | - | Creador |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Índices:**
- `PK` → `id`
- `INDEX` → `temporadaId`
- `INDEX` → `categoriaId`
- `UQ` → `(nombre, temporadaId)`

**Relaciones:**
- N → 1 con `Temporada`
- N → 1 con `Categoria`
- 1 → N con `Jugador`
- 1 → N con `Delegate`
- 1 → N con `StandingsEntry`
- 1 → N con `Carnet`
- 1 → N con `Tarjeta`

---

### 2.7 Delegate

Vincula un usuario como delegado de un equipo.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `equipoId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo |
| `userId` | `UUID` | `FK → User.id, NOT NULL` | - | Usuario delegado |
| `cargo` | `VARCHAR(100)` | `NULLABLE` | - | Cargo en el equipo |
| `principal` | `BOOLEAN` | `NOT NULL` | `false` | Es el delegado principal |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Índices:**
- `PK` → `id`
- `UQ` → `(equipoId, userId)`
- `INDEX` → `equipoId`
- `INDEX` → `userId`

**Relaciones:**
- N → 1 con `Equipo`
- N → 1 con `User`

---

### 2.8 Jugador

Jugador registrado en un equipo.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | - | Nombre del jugador |
| `apellido` | `VARCHAR(100)` | `NOT NULL` | - | Apellido del jugador |
| `dni` | `VARCHAR(20)` | `NOT NULL, UNIQUE` | - | Documento de identidad |
| `fechaNacimiento` | `DATE` | `NOT NULL` | - | Fecha de nacimiento |
| `telefono` | `VARCHAR(20)` | `NULLABLE` | - | Teléfono |
| `email` | `VARCHAR(255)` | `NULLABLE` | - | Email |
| `fotoUrl` | `VARCHAR(500)` | `NULLABLE` | - | Foto del jugador |
| `equipoId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo al que pertenece |
| `camisetaNumero` | `INTEGER` | `NULLABLE` | - | Número de camiseta |
| `posicion` | `Posicion` (enum) | `NULLABLE` | - | Posición en el campo |
| `activo` | `BOOLEAN` | `NOT NULL` | `true` | Si está activo en el equipo |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum Posicion:** `ARQUERO`, `DEFENSA`, `VOLANTE`, `DELANTERO`

**Índices:**
- `PK` → `id`
- `UQ` → `dni`
- `INDEX` → `equipoId`
- `INDEX` → `activo`

**Relaciones:**
- N → 1 con `Equipo`
- 1 → N con `Tarjeta`
- 1 → N con `Sancion`
- 1 → N con `Carnet`

---

### 2.9 Referee

Vincula un usuario como árbitro del sistema.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `userId` | `UUID` | `FK → User.id, NOT NULL, UNIQUE` | - | Usuario árbitro |
| `licencia` | `VARCHAR(50)` | `NULLABLE` | - | Número de licencia |
| `especialidad` | `VARCHAR(100)` | `NULLABLE` | - | Especialidad (central, asistente) |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Índices:**
- `PK` → `id`
- `UQ` → `userId`

**Relaciones:**
- 1 → 1 con `User`
- 1 → N con `Partido`

---

### 2.10 Cancha

Campo de juego donde se disputan los partidos.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | - | Nombre de la cancha |
| `direccion` | `VARCHAR(300)` | `NULLABLE` | - | Dirección |
| `ciudad` | `VARCHAR(100)` | `NULLABLE` | - | Ciudad |
| `capacidad` | `INTEGER` | `NULLABLE` | - | Capacidad de espectadores |
| `iluminacion` | `BOOLEAN` | `NOT NULL` | `false` | Tiene iluminación nocturna |
| `cesped` | `TipoCesped` (enum) | `NULLABLE` | - | Tipo de césped |
| `campeonatoId` | `UUID` | `FK → Campeonato.id, NOT NULL` | - | Campeonato |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum TipoCesped:** `NATURAL`, `SINTETICO`, `MIXTO`

**Índices:**
- `PK` → `id`
- `INDEX` → `campeonatoId`

**Relaciones:**
- N → 1 con `Campeonato`
- 1 → N con `Partido`

---

### 2.11 Fixture

Calendario de partidos generado para una temporada.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `temporadaId` | `UUID` | `FK → Temporada.id, NOT NULL` | - | Temporada |
| `tipoFixture` | `TipoFixture` (enum) | `NOT NULL` | - | Tipo de fixture |
| `nombre` | `VARCHAR(200)` | `NULLABLE` | - | Nombre del fixture |
| `fechaInicio` | `DATE` | `NULLABLE` | - | Fecha sugerida de inicio |
| `fechaFin` | `DATE` | `NULLABLE` | - | Fecha sugerida de fin |
| `estado` | `EstadoFixture` (enum) | `NOT NULL` | `'BORRADOR'` | Estado |
| `config` | `JSONB` | `NULLABLE` | `{}` | Configuración (vueltas, etc.) |
| `createdById` | `UUID` | `FK → User.id, NOT NULL` | - | Creador |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum TipoFixture:**
- `LIGA_IDA` — Todos contra todos a una rueda
- `LIGA_IDA_VUELTA` — Todos contra todos ida y vuelta
- `ELIMINATORIA_DIRECTA` — Eliminación directa (playoffs)
- `GRUPOS_ELIMINATORIA` — Fase grupos + eliminatoria
- `LIGA_ELIMINATORIA` — Liga regular + playoffs
- `CRUZADO` — Cruzado (equipos A vs B)
- `PERSONALIZADO` — Manual / a medida

**Enum EstadoFixture:** `BORRADOR`, `PUBLICADO`, `EN_CURSO`, `FINALIZADO`

**Índices:**
- `PK` → `id`
- `INDEX` → `temporadaId`
- `INDEX` → `estado`

**Relaciones:**
- N → 1 con `Temporada`
- 1 → N con `Partido`

---

### 2.12 Partido

Encuentro entre dos equipos.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `fixtureId` | `UUID` | `FK → Fixture.id, NOT NULL` | - | Fixture al que pertenece |
| `jornada` | `INTEGER` | `NOT NULL` | - | Número de jornada |
| `fecha` | `DATE` | `NULLABLE` | - | Fecha del partido |
| `hora` | `TIME` | `NULLABLE` | - | Hora del partido |
| `canchaId` | `UUID` | `FK → Cancha.id, NULLABLE` | - | Cancha |
| `equipoLocalId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo local |
| `equipoVisitanteId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo visitante |
| `golesLocal` | `INTEGER` | `NULLABLE` | - | Goles del equipo local |
| `golesVisitante` | `INTEGER` | `NULLABLE` | - | Goles del equipo visitante |
| `estado` | `EstadoPartido` (enum) | `NOT NULL` | `'PROGRAMADO'` | Estado |
| `refereeId` | `UUID` | `FK → Referee.id, NULLABLE` | - | Árbitro asignado |
| `observaciones` | `TEXT` | `NULLABLE` | - | Observaciones |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum EstadoPartido:** `PROGRAMADO`, `EN_CURSO`, `FINALIZADO`, `SUSPENDIDO`, `POSTERGADO`, `WALKOVER`

**Índices:**
- `PK` → `id`
- `INDEX` → `fixtureId`
- `INDEX` → `(equipoLocalId, equipoVisitanteId)`
- `INDEX` → `estado`
- `INDEX` → `jornada`
- `CHECK` → `equipoLocalId != equipoVisitanteId`

**Relaciones:**
- N → 1 con `Fixture`
- N → 1 con `Cancha`
- N → 1 con `Equipo` (local)
- N → 1 con `Equipo` (visitante)
- N → 1 con `Referee`
- 1 → N con `Tarjeta`
- 1 → N con `Sancion`

---

### 2.13 Tarjeta

Tarjeta amarilla o roja mostrada en un partido.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `partidoId` | `UUID` | `FK → Partido.id, NOT NULL` | - | Partido |
| `jugadorId` | `UUID` | `FK → Jugador.id, NOT NULL` | - | Jugador amonestado |
| `equipoId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo del jugador |
| `tipo` | `TipoTarjeta` (enum) | `NOT NULL` | - | Tipo de tarjeta |
| `minuto` | `INTEGER` | `NOT NULL` | - | Minuto en que se mostró |
| `motivo` | `VARCHAR(300)` | `NULLABLE` | - | Motivo de la amonestación |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum TipoTarjeta:** `AMARILLA`, `ROJA`, `DOBLE_AMARILLA`

**Índices:**
- `PK` → `id`
- `INDEX` → `partidoId`
- `INDEX` → `jugadorId`
- `INDEX` → `equipoId`

**Relaciones:**
- N → 1 con `Partido`
- N → 1 con `Jugador`
- N → 1 con `Equipo`
- 1 → 1 con `Sancion` (opcional, solo si deriva en sanción)

---

### 2.14 Sancion

Sanción aplicada a un jugador derivada de una tarjeta o falta grave.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `tarjetaId` | `UUID` | `FK → Tarjeta.id, NULLABLE` | - | Tarjeta que originó la sanción |
| `jugadorId` | `UUID` | `FK → Jugador.id, NOT NULL` | - | Jugador sancionado |
| `partidoId` | `UUID` | `FK → Partido.id, NOT NULL` | - | Partido donde ocurrió |
| `tipoSancion` | `TipoSancion` (enum) | `NOT NULL` | - | Tipo de sanción |
| `fechaInicio` | `DATE` | `NOT NULL` | - | Inicio de la sanción |
| `fechaFin` | `DATE` | `NULLABLE` | - | Fin de la sanción |
| `partidosSuspension` | `INTEGER` | `NULLABLE` | - | Partidos de suspensión |
| `motivo` | `TEXT` | `NOT NULL` | - | Motivo detallado |
| `aplicadaPorId` | `UUID` | `FK → User.id, NOT NULL` | - | Usuario que aplicó |
| `activa` | `BOOLEAN` | `NOT NULL` | `true` | Sanción activa |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum TipoSancion:** `SUSPENSION`, `MULTA`, `DESCALIFICACION`, `AMONESTACION`

**Índices:**
- `PK` → `id`
- `INDEX` → `jugadorId`
- `INDEX` → `(activa, fechaFin)`
- `INDEX` → `aplicadaPorId`

**Relaciones:**
- N → 1 con `Tarjeta`
- N → 1 con `Jugador`
- N → 1 con `Partido`
- N → 1 con `User` (aplicadaPor)

---

### 2.15 StandingsEntry

Registro de posición de un equipo en la tabla de posiciones.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `temporadaId` | `UUID` | `FK → Temporada.id, NOT NULL` | - | Temporada |
| `equipoId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo |
| `categoriaId` | `UUID` | `FK → Categoria.id, NOT NULL` | - | Categoría |
| `PJ` | `INTEGER` | `NOT NULL` | `0` | Partidos jugados |
| `PG` | `INTEGER` | `NOT NULL` | `0` | Partidos ganados |
| `PE` | `INTEGER` | `NOT NULL` | `0` | Partidos empatados |
| `PP` | `INTEGER` | `NOT NULL` | `0` | Partidos perdidos |
| `GF` | `INTEGER` | `NOT NULL` | `0` | Goles a favor |
| `GC` | `INTEGER` | `NOT NULL` | `0` | Goles en contra |
| `DG` | `INTEGER` | `NOT NULL` | `0` | Diferencia de goles |
| `puntos` | `INTEGER` | `NOT NULL` | `0` | Puntos acumulados |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Índices:**
- `PK` → `id`
- `UQ` → `(temporadaId, equipoId, categoriaId)`
- `INDEX` → `temporadaId`
- `INDEX` → `(categoriaId, puntos DESC)`

**Relaciones:**
- N → 1 con `Temporada`
- N → 1 con `Equipo`
- N → 1 con `Categoria`

**Reglas de Negocio:**
- `PJ = PG + PE + PP`
- `DG = GF - GC`
- `puntos = PG * 3 + PE * 1` (sistema 3 puntos por victoria)

---

### 2.16 Carnet

Carnet digital de jugador con código QR para validación.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `jugadorId` | `UUID` | `FK → Jugador.id, NOT NULL` | - | Jugador |
| `equipoId` | `UUID` | `FK → Equipo.id, NOT NULL` | - | Equipo |
| `temporadaId` | `UUID` | `FK → Temporada.id, NOT NULL` | - | Temporada |
| `codigoQR` | `VARCHAR(200)` | `NOT NULL, UNIQUE` | - | Código único del QR |
| `fechaEmision` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | Fecha de emisión |
| `fechaVencimiento` | `TIMESTAMPTZ` | `NOT NULL` | - | Fecha de vencimiento |
| `estado` | `EstadoCarnet` (enum) | `NOT NULL` | `'ACTIVO'` | Estado del carnet |
| `metadata` | `JSONB` | `NULLABLE` | `{}` | Datos extra (foto en base64, etc.) |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Enum EstadoCarnet:** `ACTIVO`, `SUSPENDIDO`, `VENCIDO`, `REVOCADO`

**Índices:**
- `PK` → `id`
- `UQ` → `codigoQR`
- `INDEX` → `jugadorId`
- `INDEX` → `(temporadaId, equipoId)`
- `INDEX` → `estado`

**Relaciones:**
- N → 1 con `Jugador`
- N → 1 con `Equipo`
- N → 1 con `Temporada`

---

### 2.17 AuditLog

Registro de auditoría para operaciones críticas del sistema.

| Columna | Tipo | Constraints | Default | Descripción |
|---------|------|-------------|---------|-------------|
| `id` | `UUID` | `PK` | `gen_random_uuid()` | Identificador único |
| `entityType` | `VARCHAR(50)` | `NOT NULL` | - | Tipo de entidad afectada |
| `entityId` | `UUID` | `NOT NULL` | - | ID de la entidad |
| `action` | `VARCHAR(50)` | `NOT NULL` | - | Acción ejecutada |
| `userId` | `UUID` | `FK → User.id, NOT NULL` | - | Usuario que ejecutó |
| `oldValue` | `JSONB` | `NULLABLE` | - | Valor anterior |
| `newValue` | `JSONB` | `NULLABLE` | - | Valor nuevo |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL` | `now()` | |

**Índices:**
- `PK` → `id`
- `INDEX` → `(entityType, entityId)`
- `INDEX` → `userId`
- `INDEX` → `createdAt`

**Relaciones:**
- N → 1 con `User`

**Propósito:** Registrar todas las operaciones CUD sobre entidades críticas para trazabilidad.

---

## 3. Resumen de Convenciones

| Convención | Estándar |
|-------------|----------|
| **Nombrado tablas** | PascalCase (ej: `StandingsEntry`) |
| **Primary Keys** | `UUID` con `gen_random_uuid()` |
| **Foreign Keys** | `<entidad>Id` camelCase |
| **Timestamps** | `createdAt`, `updatedAt` en `TIMESTAMPTZ` |
| **Enums** | Tipo nativo PostgreSQL o VARCHAR con validación |
| **Soft delete** | No, se usa `activo`/`estado` booleano |
| **JSON** | `JSONB` para datos flexibles |

---

*Documentación de Base de Datos — Campeonato v1.0.0*
