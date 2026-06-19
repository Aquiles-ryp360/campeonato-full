# Descripción de Pantallas (Mockups)

> **Versión:** 1.0.0  
> **Formato:** Wireframes textuales  
> **Última actualización:** Junio 2026

---

## Índice de Pantallas

| # | Pantalla | Roles |
|---|----------|-------|
| 1 | [Login](#p01-login) | Todos |
| 2 | [Dashboard](#p02-dashboard) | ADMIN, SUPER_ADMIN |
| 3 | [Listado de Campeonatos](#p03-listado-de-campeonatos) | Todos |
| 4 | [Detalle de Campeonato](#p04-detalle-de-campeonato) | Todos |
| 5 | [Formulario de Campeonato](#p05-formulario-de-campeonato) | ADMIN, SUPER_ADMIN |
| 6 | [Listado de Equipos](#p06-listado-de-equipos) | Todos |
| 7 | [Detalle de Equipo](#p07-detalle-de-equipo) | Todos |
| 8 | [Listado de Jugadores](#p08-listado-de-jugadores) | Todos |
| 9 | [Formulario de Jugador](#p09-formulario-de-jugador) | ADMIN, DELEGATE |
| 10 | [Vista de Fixture](#p10-vista-de-fixture) | Todos |
| 11 | [Tabla de Posiciones](#p11-tabla-de-posiciones) | Todos |
| 12 | [Previsualización de Carnet](#p12-previsualización-de-carnet) | ADMIN, DELEGATE |
| 13 | [Validador QR](#p13-validador-qr) | Público |
| 14 | [Reportes](#p14-reportes) | ADMIN |

---

## P-01: Login

### Descripción
Pantalla de inicio de sesión del sistema. Acceso público.

### Layout

```
┌─────────────────────────────────────┐
│                                     │
│              ┌─────────┐            │
│              │  LOGO   │            │
│              │  ⚽     │            │
│              └─────────┘            │
│           CAMPEONATO                │
│      Sistema de Gestión             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  Correo electrónico         │   │
│   │  ┌───────────────────────┐  │   │
│   │  │ user@example.com      │  │   │
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │  Contraseña                 │   │
│   │  ┌───────────────────────┐  │   │
│   │  │ ••••••••••••••••     │  │   │
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │  ┌───────────────────────┐  │   │
│   │  │    INICIAR SESIÓN     │  │   │
│   │  └───────────────────────┘  │   │
│   │                             │   │
│   │  ¿No tienes cuenta?        │   │
│   │  [Registrarse]             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Elementos Clave
- **Logo:** Logo del sistema centrado en la parte superior
- **Campos:** Email (input text), Password (input password)
- **Botón:** "INICIAR SESIÓN" — primario, ancho completo
- **Link:** "Registrarse" para nuevos usuarios
- **Estados:** Loading (spinner en botón), Error (mensaje en rojo "Credenciales inválidas")

### Interacciones
- Enter en el formulario envía la solicitud
- Si éxito, redirige a Dashboard
- Si error, muestra mensaje sin recargar
- Link "Registrarse" navega a formulario de registro

---

## P-02: Dashboard

### Descripción
Pantalla principal después del login. Muestra resumen ejecutivo del campeonato activo o seleccionado.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Campeonato                        [Notif] [Perfil ▼] │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  Dashboard                              Hola, Admin Juan    │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ ▲     │ │ ▲     │ │ ▲     │ │ ▲     │ │ ▲     │           │
│  │ 12    │ │ 216  │ │ 66   │ │ 48   │ │ 3    │           │
│  │Equipos│ │Jugad.│ │Part. │ │Jugados│ │Sanc. │           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ PRÓXIMOS PARTIDOS    │  │ ÚLTIMOS RESULTADOS           │ │
│  │                      │  │                              │ │
│  │ J5 — Sáb 12 Jul      │  │ J4 — Dom 06 Jul             │ │
│  │ Leones vs Tigres     │  │ Leones 3-1 Águilas          │ │
│  │ 16:00 — Cancha 1     │  │ Tigres 2-2 Dragones         │ │
│  │                      │  │                              │ │
│  │ J5 — Sáb 12 Jul      │  │ J4 — Dom 06 Jul             │ │
│  │ Águilas vs Dragones  │  │ Toros 1-0 Lobos             │ │
│  │ 17:30 — Cancha 2     │  │                              │ │
│  │                      │  │                              │ │
│  │ [Ver fixture completo]│  │ [Ver todos]                  │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ TOP GOLEADORES                                      │   │
│  │ 1. Carlos Muñoz (Leones) ..... 8 goles              │   │
│  │ 2. Pedro Díaz (Tigres) ....... 6 goles              │   │
│  │ 3. Luis Soto (Águilas) ....... 5 goles              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Navbar superior:** Logo, selector de campeonato, notificaciones, menú de perfil
- **Sidebar (no visible):** Navegación lateral con enlaces a todos los módulos
- **Cards de resumen:** 5 cards con indicadores numéricos y variación
- **Widgets:** Próximos partidos, últimos resultados, top goleadores

### Interacciones
- Click en card de resumen navega a la sección correspondiente
- "Ver fixture completo" redirige a la vista de fixture
- "Ver todos" en resultados muestra listado completo
- Selección de campeonato desde dropdown cambia los datos del dashboard

---

## P-03: Listado de Campeonatos

### Descripción
Lista todos los campeonatos con búsqueda, filtros y acciones.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Campeonatos                                  [+ Nuevo]      │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ [🔍 Buscar campeonato...]      [Todos los estados ▼] [▲▼]  │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Copa Verano 2026      │ LIGA │ EN_CURSO │ 📋 👁 ✏️ 🗑 │ │
│ │ Categorías: Libre, +40│                            │ │
│ │ Temporada: 2026       │                            │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Torneo Clausura      │ LIGA │ INSCRIPCION│ 📋 👁 ✏️ 🗑 │ │
│ │ Categorías: Femenil  │                            │ │
│ │ Temporada: 2026-2    │                            │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Copa de Campeones    │ COPA │ BORRADOR   │ 📋 👁 ✏️ 🗑 │ │
│ │ Categorías: Libre    │                            │ │
│ │ Sin temporadas       │                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Página 1 de 3                        [<] [1] [2] [3] [>]   │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Barra de búsqueda:** Filtro por texto en nombre
- **Filtro por estado:** Dropdown con estados (BORRADOR, INSCRIPCION, EN_CURSO, FINALIZADO)
- **Acciones por fila:** 📋 Detalle, 👁 Ver, ✏️ Editar, 🗑 Eliminar
- **Paginación:** Controles de página
- **Botón "+ Nuevo":** Solo visible para ADMIN/SUPER_ADMIN

### Interacciones
- Click en fila navega al detalle del campeonato
- Búsqueda en tiempo real con debounce (300ms)
- Botón "+ Nuevo" abre formulario de creación
- Acción "Eliminar" muestra confirmación modal

---

## P-04: Detalle de Campeonato

### Descripción
Vista detallada de un campeonato con sus categorías, temporadas y acceso a sub-módulos.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Campeonatos / Copa Verano 2026    [Editar] [▼ Acciones]  │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ ┌───────────────────┐  ┌──────────────────────────────────┐ │
│ │     [LOGO]        │  │  Copa Verano 2026                │ │
│ │                   │  │  Tipo: LIGA                      │ │
│ │                   │  │  Estado: ● EN_CURSO              │ │
│ │                   │  │  Creado: 01/06/2026              │ │
│ └───────────────────┘  └──────────────────────────────────┘ │
│                                                              │
│ Categorías                                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Libre       │ Equipos: 8 │ Jugadores: 144 │ [Ver ▾]    │ │
│ │ ├─ Temporada 2026    │ 01/01/2026 - 31/12/2026 │ ACTIVA│ │
│ │ │  [Equipos] [Fixture] [Standings] [Carnets]             │ │
│ │                                                           │ │
│ │ +40         │ Equipos: 4 │ Jugadores: 72  │ [Ver ▾]    │ │
│ │ ├─ Temporada 2026    │ 01/01/2026 - 31/12/2026 │ ACTIVA│ │
│ │ │  [Equipos] [Fixture] [Standings] [Carnets]             │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Canchas: 3       Árbitros: 5                                │
│ [Gestionar Canchas]  [Gestionar Árbitros]                   │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Breadcrumb:** Navegación de migas de pan
- **Header:** Logo + información resumen
- **Sección de categorías:** Expandible, con temporadas y enlaces rápidos
- **Botones:** Editar, Acciones (cambiar estado, eliminar)

### Interacciones
- Click en categoría expande/colapsa las temporadas
- Enlaces rápidos: Equipos, Fixture, Standings, Carnets
- Botón "Editar" abre formulario en modo edición
- Menú "Acciones" permite cambiar estado o eliminar

---

## P-05: Formulario de Campeonato

### Descripción
Formulario de creación/edición de campeonato.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Campeonatos / Nuevo Campeonato          [Cancelar] [Guardar]│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  Datos del Campeonato                                        │
│                                                              │
│  Nombre *                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Copa Verano 2026                                        ││
│  └─────────────────────────────────────────────────────────┘│
│  ⚠ El nombre es obligatorio                                 │
│                                                              │
│  Descripción                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Torneo de verano categoría libre para equipos de la     ││
│  │ región metropolitana                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Tipo *                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [▼ Seleccionar]  LIGA  COPA  TORNEO  AMISTOSO          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Logo (opcional)                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [📁 Seleccionar archivo]   o  arrastrar imagen aquí     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Campos:** Nombre (text), Descripción (textarea), Tipo (select), Logo (file upload)
- **Validación:** Indicadores de campo obligatorio (*), mensajes de error inline
- **Botones:** Guardar (primario), Cancelar (secundario)

### Interacciones
- Validación en cliente: nombre requerido, tipo requerido
- Upload de logo con preview
- Guardar → POST/PUT a API → redirige a detalle o listado
- Cancelar → vuelve atrás sin guardar

---

## P-06: Listado de Equipos

### Descripción
Lista de equipos filtrable por temporada y categoría.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Equipos — Copa Verano 2026 > Libre              [+ Nuevo]   │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ Categoría: [Libre ▼]    Temporada: [2026 ▼]                  │
│                                                              │
│ [🔍 Buscar equipo...]                                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔴🔵 Los Leones FC     │ 18 jug. │ Delegado: Juan P.   │ │
│ │ ⚽ Carlos Muñoz (10)   │ DEL     │ 📋 👁 ✏️ 🗑          │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ 🟡⚫ Tigres del Norte  │ 16 jug. │ Delegado: María L.   │ │
│ │ ⚽ Pedro Díaz (9)      │ DEL     │ 📋 👁 ✏️ 🗑          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Página 1 de 2                        [<] [1] [2] [>]       │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Filtros:** Categoría, Temporada (dropdowns)
- **Búsqueda:** Por nombre de equipo
- **Cards de equipo:** Escudo (colores), nombre, cantidad jugadores, delegado
- **Jugador destacado:** Mejor jugador o capitán con número y posición

### Interacciones
- Cambiar categoría o temporada recarga la lista
- Click en equipo va al detalle
- "+ Nuevo" abre formulario de creación

---

## P-07: Detalle de Equipo

### Descripción
Vista detallada de un equipo con su plantilla de jugadores y estadísticas.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Equipos / Los Leones FC                 [Editar] [▾ Acc.] │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ ┌─────────────┐    Los Leones FC                             │
│ │   [ESCUDO]  │    🔴🔵 Colores: #FF0000 / #0000FF         │
│ │             │    📋 Categoría: Libre                       │
│ │             │    📅 Temporada: 2026                        │
│ └─────────────┘    👤 Delegado: Juan Pérez                  │
│                                                              │
│ ┌────────────────────────────────────────────────────────────┐│
│ │ Jugadores (18)                       [+ Agregar Jugador]  ││
│ │ ┌────────┬──────────────┬──────┬────────┬──────────────┐  ││
│ │ │ #      │ Nombre       │ Pos. │ DNI    │ Acciones     │  ││
│ │ ├────────┼──────────────┼──────┼────────┼──────────────┤  ││
│ │ │ 10     │ Carlos Muñoz │ DEL  │ *****  │ 👁 ✏️ 🗑    │  ││
│ │ │ 1      │ Luis Soto    │ ARQ  │ *****  │ 👁 ✏️ 🗑    │  ││
│ │ │ 5      │ Pedro Díaz   │ DEF  │ *****  │ 👁 ✏️ 🗑    │  ││
│ │ └────────┴──────────────┴──────┴────────┴──────────────┘  ││
│ └────────────────────────────────────────────────────────────┘│
│                                                              │
│ Partidos Jugados: 8    PG: 6    PE: 1    PP: 1              │
│ Goles: 18    Posición: 1°                                    │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Header:** Escudo + info del equipo
- **Tabla de jugadores:** Número, nombre, posición, DNI (enmascarado), acciones
- **Estadísticas:** Resumen de rendimiento

### Interacciones
- Click en jugador va a detalle del jugador
- "+ Agregar Jugador" abre formulario modal o página nueva
- Acciones: Ver, Editar, Desactivar jugador

---

## P-08: Listado de Jugadores

### Descripción
Lista de jugadores con búsqueda y filtros.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Jugadores — Los Leones FC                     [+ Nuevo]      │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ Equipo: [Los Leones FC ▼]    Posición: [Todas ▼]            │
│                                                              │
│ [🔍 Buscar por nombre o DNI...]                              │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [Foto]  Carlos Muñoz     │ 10 │ DEL │ Activo │ 👁 ✏️   │ │
│ │         DNI: 12.345.678-9│     │     │        │ [Carnet]│ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ [Foto]  Luis Soto        │ 1  │ ARQ │ Activo │ 👁 ✏️   │ │
│ │         DNI: 98.765.432-1│     │     │        │ [Carnet]│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Filtros:** Equipo, Posición
- **Búsqueda:** Por nombre o DNI
- **Cards o filas:** Foto, nombre, número, posición, estado, acciones
- **Acción rápida:** "Carnet" para generar carnet directamente

### Interacciones
- Click en jugador abre detalle/edición
- Botón "Carnet" abre el flujo de generación de carnet

---

## P-09: Formulario de Jugador

### Descripción
Formulario de registro o edición de jugador.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Jugadores / Nuevo Jugador              [Cancelar] [Guardar]│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  ┌──────────────────────┐    Datos del Jugador              │
│  │                      │                                   │
│  │      [FOTO]          │    Nombres *                      │
│  │                      │    ┌────────────────────────────┐ │
│  │   [📷 Subir foto]    │    │ Carlos                    │ │
│  │                      │    └────────────────────────────┘ │
│  └──────────────────────┘                                   │
│                              Apellidos *                    │
│                              ┌────────────────────────────┐ │
│                              │ Muñoz                      │ │
│                              └────────────────────────────┘ │
│                                                              │
│  DNI *                    Fecha Nacimiento *                │
│  ┌────────────────────┐   ┌────────────────────┐          │
│  │ 12.345.678-9       │   │ 15/05/1998         │          │
│  └────────────────────┘   └────────────────────┘          │
│                                                              │
│  Teléfono               Email                               │
│  ┌────────────────────┐   ┌────────────────────┐          │
│  │ +56 9 1234 5678    │   │ carlos@email.com   │          │
│  └────────────────────┘   └────────────────────┘          │
│                                                              │
│  Número Camiseta          Posición                          │
│  ┌────────────────────┐   ┌────────────────────┐          │
│  │ 10                 │   │ [▼ DELANTERO ▼]   │          │
│  └────────────────────┘   └────────────────────┘          │
│                                                              │
│  Estado: [✓] Activo                                         │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Foto:** Upload con preview circular
- **Campos:** Nombres, apellidos, DNI, fecha nacimiento, teléfono, email, número, posición
- **Select de posición:** ARQUERO, DEFENSA, VOLANTE, DELANTERO
- **Checkbox:** Activo

### Interacciones
- Upload de foto con preview en tiempo real
- Validación de DNI (formato chileno: 12.345.678-9)
- Selector de fecha con datepicker
- Guardar envía datos a API

---

## P-10: Vista de Fixture

### Descripción
Calendario de partidos agrupado por jornadas.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Fixture / Liga — Temporada 2026          [Editar] [▾ Acc.]│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ Fixture: Copa Verano 2026 — Libre — 2026                     │
│ Tipo: LIGA_IDA    Estado: ● PUBLICADO                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Jornada 1 — Sábado 05 de Julio                          │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ Leones FC    3 - 1   Águilas   16:00  Cancha 1  ✅│  │ │
│ │ │ Tigres       2 - 2   Dragones  17:30  Cancha 2  ✅│  │ │
│ │ │ Toros        1 - 0   Lobos     19:00  Cancha 3  ✅│  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │                                                          │ │
│ │ Jornada 2 — Sábado 12 de Julio                          │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ Leones FC    -      Dragones  16:00  Cancha 1  ⏳│  │ │
│ │ │ Águilas      -      Toros     17:30  Cancha 2  ⏳│  │ │
│ │ │ Lobos        -      Tigres    19:00  Cancha 3  ⏳│  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [⬅ Anterior]                           [Próxima Jornada ➡] │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Estado del fixture:** Indicador visual
- **Jornadas:** Expandibles o navegación por flechas
- **Partidos:** Equipo local - goles - equipo visitante, hora, cancha
- **Indicadores:** ✅ Finalizado, ⏳ Programado, 🔴 Suspendido

### Interacciones
- Click en partido abre detalle del partido
- Flechas navegan entre jornadas
- "Editar" permite modificar fixture
- "Acciones" incluye publicar, reprogramar, finalizar

---

## P-11: Tabla de Posiciones

### Descripción
Tabla de posiciones con estadísticas completas.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Standings — Copa Verano 2026 > Libre                      │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ Categoría: [Libre ▼]                                         │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ #  Equipo         PJ  PG  PE  PP  GF  GC  DG  PTS       │ │
│ │ ──────────────────────────────────────────────────────── │ │
│ │ 1  🥇 Leones FC    8   6   1   1   18  8   +10  19      │ │
│ │ 2  🥈 Tigres       8   5   2   1   15  9   +6   17      │ │
│ │ 3  🥉 Dragones     8   4   2   2   12  10  +2   14      │ │
│ │ 4  ─  Águilas      8   3   2   3   11  12  -1   11      │ │
│ │ 5  ─  Toros        8   2   1   5   8   14  -6   7       │ │
│ │ 6  ─  Lobos        8   0   0   8   4   20  -16  0       │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Leyenda: 🥇 Clasifica   🥈 Clasifica   🥉 Clasifica        │
│                                                              │
│ [Exportar PDF] [Exportar Excel]                              │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Tabla:** #, Equipo, PJ, PG, PE, PP, GF, GC, DG, PTS
- **Ordenamiento:** Por puntos descendente
- **Indicadores:** Medallas para los primeros puestos
- **Acciones:** Exportar PDF, Exportar Excel

### Interacciones
- Click en equipo filtra o navega al detalle
- Exportar descarga archivo

---

## P-12: Previsualización de Carnet

### Descripción
Vista del carnet digital generado para un jugador.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Jugadores / Carlos Muñoz / Carnet     [Descargar] [Imprimir]│
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    CARNET DE JUGADOR                  │   │
│  │                    ────────────────                   │   │
│  │                                                       │   │
│  │  ┌──────────┐      COPA VERANO 2026                  │   │
│  │  │          │      ────────────────                   │   │
│  │  │  [FOTO]  │      Nombre: Carlos Muñoz              │   │
│  │  │          │      DNI: 12.345.678-9                 │   │
│  │  │          │      F. Nac.: 15/05/1998               │   │
│  │  └──────────┘      Equipo: Los Leones FC             │   │
│  │                     N°: 10  Pos: DELANTERO           │   │
│  │                                                       │   │
│  │              ┌─────────────────┐                     │   │
│  │              │    █████████    │                     │   │
│  │              │   ██ QR ████   │                     │   │
│  │              │    █████████    │                     │   │
│  │              └─────────────────┘                     │   │
│  │                                                       │   │
│  │              Emitido: 01/07/2026                      │   │
│  │              Vence: 31/12/2026                        │   │
│  │              Estado: ✅ ACTIVO                        │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Regenerar QR]  [Suspender Carnet]  [Renovar]             │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Diseño de carnet:** Formato tipo credencial/tarjeta
- **Foto:** Del jugador
- **Datos:** Nombre, DNI, fecha nacimiento, equipo, número, posición
- **Código QR:** Cuadrado con el hash único
- **Fechas:** Emisión y vencimiento
- **Estado:** Indicador visual (ACTIVO = verde)

### Interacciones
- "Descargar" → descarga imagen/PDF del carnet
- "Imprimir" → abre diálogo de impresión del navegador
- "Regenerar QR" → genera nuevo QR (invalida el anterior)
- "Suspender Carnet" → cambia estado a SUSPENDIDO

---

## P-13: Validador QR

### Descripción
Pantalla pública de validación de carnets mediante escaneo QR.

### Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ┌──────────────────┐                    │
│              │                  │                    │
│              │    ╔════════╗    │                    │
│              │    ║  📷   ║    │                    │
│              │    ║ ESCÁN ║    │                    │
│              │    ║  QR   ║    │                    │
│              │    ╚════════╝    │                    │
│              │                  │                    │
│              └──────────────────┘                    │
│                                                      │
│        Apunta la cámara al código QR                │
│           del carnet del jugador                    │
│                                                      │
│        ── o ingresa el código manualmente ──       │
│                                                      │
│        ┌──────────────────────────────────┐        │
│        │ Código QR                        │        │
│        └──────────────────────────────────┘        │
│        [Validar]                                    │
│                                                      │
└──────────────────────────────────────────────────────┘

─── RESULTADO VÁLIDO ───

┌──────────────────────────────────────────────────────┐
│  ✅ CARNET VÁLIDO                                    │
│                                                      │
│  ┌────────┐  Carlos Muñoz                          │
│  │ [FOTO] │  DNI: 12.345.678-9                     │
│  │        │  Equipo: Los Leones FC                 │
│  │        │  Temporada: 2026                       │
│  └────────┘  Estado: ✅ ACTIVO                      │
│                                                      │
└──────────────────────────────────────────────────────┘

─── RESULTADO INVÁLIDO ───

┌──────────────────────────────────────────────────────┐
│  ❌ CARNET INVÁLIDO                                 │
│                                                      │
│  Motivo: El carnet no corresponde a un jugador      │
│  registrado en el sistema.                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Escáner QR:** Recuadro de cámara con overlay
- **Input manual:** Para ingresar código si no funciona cámara
- **Resultado válido:** Pantalla verde con datos del jugador
- **Resultado inválido:** Pantalla roja con motivo

### Interacciones
- Cámara escanea automáticamente al detectar QR
- Input manual permite pegar código
- Resultado se muestra con animación (check verde / X roja)

---

## P-14: Reportes

### Descripción
Pantalla de generación y descarga de reportes.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Reportes                                                     │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│ Campeonato: [Copa Verano 2026 ▼]                             │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📄 REPORTES PDF                                        │ │
│ │                                                         │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ 🏆 Fixture Completo                    [Descargar] │  │ │
│ │ │    Fixture de la temporada con todos los partidos  │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ 📊 Tabla de Posiciones                  [Descargar] │  │ │
│ │ │    Clasificación actualizada de equipos            │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ ⚠ Sanciones Activas                      [Descargar] │  │ │
│ │ │    Lista de jugadores sancionados                  │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📊 REPORTES EXCEL                                      │ │
│ │                                                         │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ 👥 Equipos + Jugadores                   [Descargar] │  │ │
│ │ │    Todos los equipos con sus jugadores             │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ ⚽ Partidos por Temporada                  [Descargar] │  │ │
│ │ │    Todos los partidos con resultados               │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ 🃏 Carnets Emitidos                       [Descargar] │  │ │
│ │ │    Lista de carnets generados por jugador          │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Elementos Clave
- **Selector de campeonato:** Para elegir contexto
- **Sección PDF:** Reportes en formato PDF
- **Sección Excel:** Exportaciones en formato Excel
- **Cards por reporte:** Icono, nombre, descripción, botón descargar

### Interacciones
- Click en "Descargar" inicia la generación y descarga
- Mientras se genera, botón muestra spinner

---

*Mockups — Campeonato v1.0.0*
