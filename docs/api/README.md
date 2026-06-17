# Documentación de API

> **Versión:** 1.0.0  
> **Base URL:** `/api/v1`  
> **Formato:** JSON  
> **Autenticación:** Bearer JWT  

---

## Convenciones Generales

### Formato de Respuesta

```json
// Éxito
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 10 }
}

// Error
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Códigos de Error Comunes

| Código | Significado |
|--------|-------------|
| `400` | Bad Request — datos inválidos |
| `401` | Unauthorized — token faltante o expirado |
| `403` | Forbidden — rol sin permiso |
| `404` | Not Found — recurso inexistente |
| `409` | Conflict — duplicado (email, DNI, etc.) |
| `422` | Unprocessable Entity — validación de negocio |
| `429` | Too Many Requests — rate limit excedido |
| `500` | Internal Server Error |

---

## Módulo: Auth

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `POST` | `/auth/register` | Registrar nuevo usuario | No | - |
| `POST` | `/auth/login` | Iniciar sesión | No | - |
| `POST` | `/auth/refresh` | Renovar access token | Refresh | - |
| `POST` | `/auth/logout` | Cerrar sesión (revocar refresh) | Sí | Todos |
| `GET` | `/auth/me` | Obtener perfil del usuario actual | Sí | Todos |
| `PATCH` | `/auth/me` | Actualizar perfil propio | Sí | Todos |
| `PATCH` | `/auth/me/password` | Cambiar contraseña | Sí | Todos |

### POST /auth/register

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ngP@ss!",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "+56912345678"
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nombre": "Juan",
      "apellido": "Pérez",
      "rol": "VIEWER",
      "activo": true
    },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

**Errores:** `400` (validación), `409` (email duplicado)

### POST /auth/login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Str0ngP@ss!"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "nombre": "...", "rol": "ADMIN" },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

**Errores:** `401` (credenciales inválidas)

### POST /auth/refresh

**Header:** `Authorization: Bearer <refreshToken>`

**Response (200):**
```json
{
  "data": {
    "accessToken": "new-jwt...",
    "refreshToken": "new-refresh-jwt..."
  }
}
```

**Errores:** `401` (token inválido o revocado)

### POST /auth/logout

**Header:** `Authorization: Bearer <refreshToken>`

**Response (200):**
```json
{ "data": { "message": "Sesión cerrada exitosamente" } }
```

### GET /auth/me

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "ADMIN",
    "telefono": "+56912345678",
    "fotoUrl": null,
    "activo": true,
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

### PATCH /auth/me

**Request Body:**
```json
{
  "nombre": "Juan Carlos",
  "telefono": "+56987654321"
}
```

**Response (200):** Objeto usuario actualizado

### PATCH /auth/me/password

**Request Body:**
```json
{
  "currentPassword": "Str0ngP@ss!",
  "newPassword": "Nuev@P@ss1"
}
```

**Response (200):** `{ "data": { "message": "Contraseña actualizada" } }`

---

## Módulo: Users (Admin)

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/users` | Listar usuarios | Sí | SUPER_ADMIN |
| `GET` | `/users/:id` | Obtener usuario por ID | Sí | SUPER_ADMIN |
| `POST` | `/users` | Crear usuario (por admin) | Sí | SUPER_ADMIN |
| `PATCH` | `/users/:id` | Actualizar usuario | Sí | SUPER_ADMIN |
| `DELETE` | `/users/:id` | Eliminar usuario (desactivar) | Sí | SUPER_ADMIN |

### GET /users

**Query Params:** `?page=1&limit=10&rol=ADMIN&activo=true&search=Juan`

**Response (200):**
```json
{
  "data": [
    { "id": "uuid", "email": "...", "nombre": "...", "rol": "ADMIN", "activo": true }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10 }
}
```

---

## Módulo: Campeonatos

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/campeonatos` | Listar campeonatos | Sí | Todos |
| `GET` | `/campeonatos/:id` | Obtener campeonato por ID | Sí | Todos |
| `POST` | `/campeonatos` | Crear campeonato | Sí | SUPER_ADMIN, ADMIN |
| `PATCH` | `/campeonatos/:id` | Actualizar campeonato | Sí | SUPER_ADMIN, ADMIN |
| `DELETE` | `/campeonatos/:id` | Eliminar campeonato | Sí | SUPER_ADMIN |
| `PATCH` | `/campeonatos/:id/estado` | Cambiar estado | Sí | SUPER_ADMIN, ADMIN |

### POST /campeonatos

**Request Body:**
```json
{
  "nombre": "Copa Verano 2026",
  "descripcion": "Torneo de verano categoría libre",
  "tipo": "LIGA",
  "logoUrl": "https://..."
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "nombre": "Copa Verano 2026",
    "descripcion": "Torneo de verano categoría libre",
    "tipo": "LIGA",
    "estado": "BORRADOR",
    "createdById": "uuid",
    "createdAt": "2026-06-01T12:00:00Z"
  }
}
```

### GET /campeonatos

**Query Params:** `?page=1&limit=10&estado=EN_CURSO&tipo=LIGA&search=verano`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Copa Verano 2026",
      "tipo": "LIGA",
      "estado": "EN_CURSO",
      "logoUrl": null,
      "categorias": [...],
      "createdAt": "2026-06-01T12:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 10 }
}
```

---

## Módulo: Equipos

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/equipos` | Listar equipos | Sí | Todos |
| `GET` | `/equipos/:id` | Obtener equipo | Sí | Todos |
| `POST` | `/equipos` | Crear equipo | Sí | ADMIN, DELEGATE |
| `PATCH` | `/equipos/:id` | Actualizar equipo | Sí | ADMIN, DELEGATE (propio) |
| `DELETE` | `/equipos/:id` | Eliminar equipo | Sí | ADMIN, SUPER_ADMIN |

### GET /equipos

**Query Params:** `?page=1&limit=10&temporadaId=uuid&categoriaId=uuid&search=equipo`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Los Leones FC",
      "escudoUrl": "https://...",
      "colorPrincipal": "#FF0000",
      "colorSecundario": "#FFFFFF",
      "jugadoresCount": 18,
      "temporadaId": "uuid"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 10 }
}
```

### POST /equipos

**Request Body:**
```json
{
  "nombre": "Los Leones FC",
  "escudoUrl": "https://...",
  "colorPrincipal": "#FF0000",
  "colorSecundario": "#FFFFFF",
  "temporadaId": "uuid",
  "categoriaId": "uuid"
}
```

---

## Módulo: Jugadores

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/jugadores` | Listar jugadores | Sí | Todos |
| `GET` | `/jugadores/:id` | Obtener jugador | Sí | Todos |
| `POST` | `/jugadores` | Crear jugador | Sí | ADMIN, DELEGATE |
| `PATCH` | `/jugadores/:id` | Actualizar jugador | Sí | ADMIN, DELEGATE |
| `DELETE` | `/jugadores/:id` | Eliminar jugador (desactivar) | Sí | ADMIN, SUPER_ADMIN |
| `GET` | `/jugadores/:id/historial` | Historial del jugador | Sí | Todos |

### POST /jugadores

**Request Body:**
```json
{
  "nombre": "Carlos",
  "apellido": "Muñoz",
  "dni": "12345678-9",
  "fechaNacimiento": "1998-05-15",
  "telefono": "+56998765432",
  "email": "carlos@example.com",
  "equipoId": "uuid",
  "camisetaNumero": 10,
  "posicion": "DELANTERO",
  "fotoUrl": "https://..."
}
```

### GET /jugadores/:id/historial

**Response (200):**
```json
{
  "data": {
    "jugador": { ... },
    "partidos": [
      { "fecha": "2026-03-10", "rival": "Equipo X", "goles": 1, "tarjetas": [] }
    ],
    "tarjetas": [...],
    "sanciones": [...],
    "carnets": [...]
  }
}
```

---

## Módulo: Partidos

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/partidos` | Listar partidos | Sí | Todos |
| `GET` | `/partidos/:id` | Obtener partido | Sí | Todos |
| `POST` | `/partidos` | Crear partido (manual) | Sí | ADMIN |
| `PATCH` | `/partidos/:id` | Actualizar partido | Sí | ADMIN |
| `POST` | `/partidos/:id/resultado` | Registrar resultado | Sí | ADMIN, REFEREE |
| `PATCH` | `/partidos/:id/estado` | Cambiar estado | Sí | ADMIN |
| `DELETE` | `/partidos/:id` | Eliminar partido | Sí | ADMIN, SUPER_ADMIN |

### POST /partidos/:id/resultado

**Request Body:**
```json
{
  "golesLocal": 3,
  "golesVisitante": 1,
  "observaciones": "Partido intenso"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "golesLocal": 3,
    "golesVisitante": 1,
    "estado": "FINALIZADO",
    "equipoLocal": { "id": "uuid", "nombre": "Local" },
    "equipoVisitante": { "id": "uuid", "nombre": "Visitante" }
  }
}
```

**Reglas:**
- Una vez finalizado, no se puede modificar el resultado (solo ADMIN puede corregir)
- Al registrar resultado, se actualiza automáticamente la tabla de posiciones

---

## Módulo: Fixture

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/fixtures` | Listar fixtures | Sí | Todos |
| `GET` | `/fixtures/:id` | Obtener fixture con partidos | Sí | Todos |
| `POST` | `/fixtures` | Crear fixture (generar) | Sí | ADMIN |
| `PATCH` | `/fixtures/:id` | Actualizar fixture | Sí | ADMIN |
| `DELETE` | `/fixtures/:id` | Eliminar fixture | Sí | ADMIN, SUPER_ADMIN |
| `PATCH` | `/fixtures/:id/estado` | Publicar / finalizar fixture | Sí | ADMIN |
| `POST` | `/fixtures/:id/reprogramar` | Reprogramar fixture (regenerar fechas) | Sí | ADMIN |

### POST /fixtures

**Request Body (LIGA_IDA):**
```json
{
  "temporadaId": "uuid",
  "tipoFixture": "LIGA_IDA",
  "nombre": "Fase Regular",
  "fechaInicio": "2026-07-01",
  "config": {}
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "temporadaId": "uuid",
    "tipoFixture": "LIGA_IDA",
    "estado": "BORRADOR",
    "partidos": [
      {
        "jornada": 1,
        "equipoLocalId": "uuid",
        "equipoVisitanteId": "uuid",
        "estado": "PROGRAMADO"
      }
    ],
    "totalPartidos": 15
  }
}
```

### GET /fixtures/:id

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "tipoFixture": "LIGA_IDA",
    "nombre": "Fase Regular",
    "estado": "PUBLICADO",
    "jornadas": [
      {
        "numero": 1,
        "partidos": [
          {
            "id": "uuid",
            "equipoLocal": { "nombre": "Equipo A" },
            "equipoVisitante": { "nombre": "Equipo B" },
            "fecha": "2026-07-05",
            "hora": "16:00",
            "cancha": { "nombre": "Cancha 1" },
            "estado": "PROGRAMADO"
          }
        ]
      }
    ]
  }
}
```

---

## Módulo: Canchas

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/canchas` | Listar canchas | Sí | Todos |
| `GET` | `/canchas/:id` | Obtener cancha | Sí | Todos |
| `POST` | `/canchas` | Crear cancha | Sí | ADMIN |
| `PATCH` | `/canchas/:id` | Actualizar cancha | Sí | ADMIN |
| `DELETE` | `/canchas/:id` | Eliminar cancha | Sí | ADMIN, SUPER_ADMIN |

---

## Módulo: Sanciones

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/sanciones` | Listar sanciones | Sí | Todos |
| `GET` | `/sanciones/:id` | Obtener sanción | Sí | Todos |
| `POST` | `/sanciones` | Aplicar sanción manual | Sí | ADMIN |
| `PATCH` | `/sanciones/:id` | Modificar sanción | Sí | ADMIN |
| `DELETE` | `/sanciones/:id` | Eliminar sanción | Sí | ADMIN, SUPER_ADMIN |
| `POST` | `/sanciones/calcular-auto` | Calcular sanciones automáticas | Sí | ADMIN |
| `GET` | `/sanciones/jugador/:jugadorId` | Sanciones por jugador | Sí | Todos |

### POST /sanciones

**Request Body:**
```json
{
  "jugadorId": "uuid",
  "partidoId": "uuid",
  "tipoSancion": "SUSPENSION",
  "fechaInicio": "2026-07-10",
  "fechaFin": "2026-07-24",
  "partidosSuspension": 2,
  "motivo": "Agresión verbal al árbitro"
}
```

**Response (201):** Sanción creada

---

## Módulo: Carnets

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/carnets` | Listar carnets | Sí | ADMIN |
| `GET` | `/carnets/:id` | Obtener carnet | Sí | ADMIN, DELEGATE |
| `POST` | `/carnets/generar` | Generar carnet(s) | Sí | ADMIN |
| `POST` | `/carnets/validar` | Validar carnet por QR | No | - |
| `GET` | `/carnets/:id/qr` | Obtener imagen QR | Sí | Todos |
| `PATCH` | `/carnets/:id/estado` | Suspender/revocar carnet | Sí | ADMIN |

### POST /carnets/generar

**Request Body:**
```json
{
  "jugadorId": "uuid",
  "equipoId": "uuid",
  "temporadaId": "uuid"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "jugador": { "nombre": "Carlos", "apellido": "Muñoz" },
    "equipo": { "nombre": "Los Leones FC" },
    "codigoQR": "unique-hash-123",
    "fechaEmision": "2026-07-01T00:00:00Z",
    "fechaVencimiento": "2026-12-31T00:00:00Z",
    "estado": "ACTIVO",
    "qrImageUrl": "/api/v1/carnets/uuid/qr"
  }
}
```

### POST /carnets/validar

**Request Body:**
```json
{
  "codigoQR": "unique-hash-123"
}
```

**Response (200):**
```json
{
  "data": {
    "valido": true,
    "carnet": {
      "id": "uuid",
      "estado": "ACTIVO",
      "jugador": { "nombre": "Carlos", "apellido": "Muñoz", "dni": "12345678-9" },
      "equipo": { "nombre": "Los Leones FC" },
      "temporada": { "nombre": "Temporada 2026" }
    }
  }
}
```

**Errores:** `404` (QR no encontrado), `400` (carnet vencido o suspendido)

---

## Módulo: Dashboard

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/dashboard/resumen` | Resumen general del sistema | Sí | ADMIN, SUPER_ADMIN |
| `GET` | `/dashboard/campeonato/:id` | Dashboard de un campeonato | Sí | Todos |

### GET /dashboard/campeonato/:id

**Response (200):**
```json
{
  "data": {
    "resumen": {
      "equipos": 12,
      "jugadores": 216,
      "partidosProgramados": 30,
      "partidosJugados": 18,
      "porcentajeCompletado": 60
    },
    "proximosPartidos": [
      {
        "jornada": 5,
        "fecha": "2026-07-12",
        "local": "Equipo A",
        "visitante": "Equipo B",
        "hora": "16:00",
        "cancha": "Cancha 1"
      }
    ],
    "ultimosResultados": [...],
    "maxGoleador": { "nombre": "Carlos", "goles": 8 },
    "equipoMasGoleador": { "nombre": "Equipo A", "goles": 25 },
    "sancionesActivas": 3
  }
}
```

---

## Módulo: Reportes

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/reportes/fixture/:fixtureId` | Descargar fixture en PDF | Sí | ADMIN |
| `GET` | `/reportes/standings/:temporadaId` | Descargar tabla en PDF | Sí | ADMIN |
| `GET` | `/reportes/sanciones/:temporadaId` | Descargar sanciones en PDF | Sí | ADMIN |
| `GET` | `/reportes/equipos/:temporadaId/excel` | Exportar equipos a Excel | Sí | ADMIN |
| `GET` | `/reportes/jugadores/:equipoId/excel` | Exportar jugadores a Excel | Sí | ADMIN |
| `GET` | `/reportes/partidos/:temporadaId/excel` | Exportar partidos a Excel | Sí | ADMIN |

### GET /reportes/fixture/:fixtureId

**Response:** Archivo PDF (Content-Type: `application/pdf`)

---

## Endpoints Auxiliares

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/categorias` | Listar categorías | Sí | Todos |
| `GET` | `/categorias/:id` | Obtener categoría | Sí | Todos |
| `POST` | `/categorias` | Crear categoría | Sí | ADMIN |
| `PATCH` | `/categorias/:id` | Actualizar categoría | Sí | ADMIN |
| `DELETE` | `/categorias/:id` | Eliminar categoría | Sí | ADMIN, SUPER_ADMIN |
| `GET` | `/temporadas` | Listar temporadas | Sí | Todos |
| `GET` | `/temporadas/:id` | Obtener temporada | Sí | Todos |
| `POST` | `/temporadas` | Crear temporada | Sí | ADMIN |
| `PATCH` | `/temporadas/:id` | Actualizar temporada | Sí | ADMIN |
| `DELETE` | `/temporadas/:id` | Eliminar temporada | Sí | ADMIN, SUPER_ADMIN |
| `GET` | `/delegados` | Listar delegados | Sí | ADMIN |
| `POST` | `/delegados` | Asignar delegado a equipo | Sí | ADMIN |
| `DELETE` | `/delegados/:id` | Remover delegado | Sí | ADMIN |
| `GET` | `/referees` | Listar árbitros | Sí | ADMIN |
| `POST` | `/referees` | Registrar árbitro | Sí | ADMIN |
| `DELETE` | `/referees/:id` | Eliminar árbitro | Sí | ADMIN |
| `GET` | `/standings/:temporadaId` | Tabla de posiciones | Sí | Todos |
| `POST` | `/tarjetas` | Registrar tarjeta | Sí | REFEREE, ADMIN |
| `GET` | `/tarjetas/partido/:partidoId` | Tarjetas de un partido | Sí | Todos |

### GET /standings/:temporadaId

**Query Params:** `?categoriaId=uuid`

**Response (200):**
```json
{
  "data": [
    {
      "posicion": 1,
      "equipo": { "id": "uuid", "nombre": "Equipo A" },
      "PJ": 10, "PG": 8, "PE": 1, "PP": 1,
      "GF": 25, "GC": 8, "DG": 17, "puntos": 25
    }
  ],
  "meta": { "total": 12 }
}
```

---

## Módulo: AuditLog (Solo SUPER_ADMIN)

| Método | Path | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| `GET` | `/audit-logs` | Listar logs de auditoría | Sí | SUPER_ADMIN |
| `GET` | `/audit-logs/:id` | Obtener detalle de log | Sí | SUPER_ADMIN |

### GET /audit-logs

**Query Params:** `?page=1&limit=20&entityType=Campeonato&entityId=uuid&action=CREATE&userId=uuid`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "entityType": "Campeonato",
      "entityId": "uuid",
      "action": "CREATE",
      "user": { "id": "uuid", "nombre": "Admin" },
      "oldValue": null,
      "newValue": { "nombre": "Copa Verano 2026" },
      "createdAt": "2026-06-01T12:00:00Z"
    }
  ],
  "meta": { "total": 150, "page": 1, "limit": 20 }
}
```

---

*Documentación de API — Campeonato v1.0.0*
