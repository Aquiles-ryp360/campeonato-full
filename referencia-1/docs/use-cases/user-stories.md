# Historias de Usuario

> **Versión:** 1.0.0  
> **Total:** 35 historias  
> **Última actualización:** Junio 2026

---

## Formato

```
ID: US-XXX
Rol: [Rol]
Historia: Como [rol], quiero [acción] para [beneficio].
Prioridad: Alta / Media / Baja
Esfuerzo: S / M / L / XL
Dependencias: US-XXX
Criterios de Aceptación:
  - [ ] Criterio 1
  - [ ] Criterio 2
```

---

## Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **SUPER_ADMIN** | Administrador global del sistema. Puede gestionar usuarios y todos los campeonatos. |
| **ADMIN** | Administrador de campeonatos. Gestiona torneos, equipos, partidos y configuraciones. |
| **DELEGATE** | Delegado de equipo. Registra y gestiona jugadores, ve información del equipo. |
| **REFEREE** | Árbitro. Registra resultados de partidos y reporta incidencias. |
| **VIEWER** | Visibilidad de solo lectura en el sistema. |

---

## Módulo: Autenticación y Usuarios

### US-001 — Registro de usuario
```
ID: US-001
Rol: Todos
Historia: Como [usuario nuevo], quiero [registrarme con email y contraseña] para [acceder al sistema].
Prioridad: Alta
Esfuerzo: M
Criterios de Aceptación:
  - [ ] El formulario solicita email, contraseña, nombre y apellido
  - [ ] El email debe ser único en el sistema
  - [ ] La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número
  - [ ] Al registrarme, se me asigna rol VIEWER por defecto
  - [ ] Recibo un mensaje de confirmación y puedo iniciar sesión
```

### US-002 — Inicio de sesión
```
ID: US-002
Rol: Todos
Historia: Como [usuario registrado], quiero [iniciar sesión con mi email y contraseña] para [acceder a mis funcionalidades según mi rol].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-001
Criterios de Aceptación:
  - [ ] Ingreso email y contraseña y hago clic en "Iniciar Sesión"
  - [ ] Si las credenciales son correctas, recibo un JWT y soy redirigido al dashboard
  - [ ] Si las credenciales son incorrectas, veo un mensaje de error
  - [ ] La sesión se mantiene activa hasta que cierre sesión o expire el token
  - [ ] Puedo marcar "Recordarme" para sesión prolongada
```

### US-003 — Cierre de sesión
```
ID: US-003
Rol: Todos
Historia: Como [usuario autenticado], quiero [cerrar sesión] para [proteger mi cuenta en dispositivos compartidos].
Prioridad: Alta
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Hay un botón "Cerrar Sesión" en el menú de perfil
  - [ ] Al cerrar sesión, el token se invalida
  - [ ] Soy redirigido a la pantalla de login
```

### US-004 — Recuperación de contraseña
```
ID: US-004
Rol: Todos
Historia: Como [usuario], quiero [recuperar mi contraseña si la olvido] para [poder acceder nuevamente al sistema].
Prioridad: Media
Esfuerzo: M
Criterios de Aceptación:
  - [ ] Hay un link "¿Olvidaste tu contraseña?" en la pantalla de login
  - [ ] Ingreso mi email y recibo un link de restablecimiento
  - [ ] El link expira después de 1 hora
  - [ ] Puedo establecer una nueva contraseña
```

### US-005 — Gestión de usuarios (SUPER_ADMIN)
```
ID: US-005
Rol: SUPER_ADMIN
Historia: Como [SUPER_ADMIN], quiero [listar, crear, editar y desactivar usuarios] para [administrar quién tiene acceso al sistema].
Prioridad: Alta
Esfuerzo: L
Criterios de Aceptación:
  - [ ] Puedo ver todos los usuarios con su rol y estado
  - [ ] Puedo filtrar por rol, estado y buscar por nombre/email
  - [ ] Puedo crear usuarios con cualquier rol
  - [ ] Puedo cambiar el rol de un usuario
  - [ ] Puedo desactivar un usuario (no se elimina, se desactiva)
```

### US-006 — Ver mi perfil
```
ID: US-006
Rol: Todos
Historia: Como [usuario], quiero [ver y editar mi perfil] para [mantener mis datos actualizados].
Prioridad: Media
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Puedo ver mi nombre, email, rol, teléfono y foto
  - [ ] Puedo editar nombre, apellido, teléfono y foto
  - [ ] No puedo cambiar mi email ni mi rol
  - [ ] Los cambios se guardan y reflejan inmediatamente
```

---

## Módulo: Campeonatos

### US-007 — Crear campeonato
```
ID: US-007
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [crear un nuevo campeonato con nombre, tipo y descripción] para [organizar un torneo].
Prioridad: Alta
Esfuerzo: M
Criterios de Aceptación:
  - [ ] El formulario incluye nombre (obligatorio), descripción, tipo y logo
  - [ ] El campeonato se crea en estado BORRADOR
  - [ ] Puedo agregar categorías al mismo tiempo
  - [ ] Recibo confirmación y soy redirigido al detalle del campeonato
```

### US-008 — Listar campeonatos
```
ID: US-008
Rol: Todos
Historia: Como [usuario], quiero [ver la lista de campeonatos] para [seleccionar uno y ver su información].
Prioridad: Alta
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Veo una lista con nombre, tipo, estado y fecha de creación
  - [ ] Puedo buscar por nombre
  - [ ] Puedo filtrar por estado y tipo
  - [ ] La lista está paginada
```

### US-009 — Editar campeonato
```
ID: US-009
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [editar los datos de un campeonato existente] para [corregir información o actualizarla].
Prioridad: Alta
Esfuerzo: S
Dependencias: US-007
Criterios de Aceptación:
  - [ ] Puedo modificar nombre, descripción, tipo y logo
  - [ ] Los cambios se guardan y reflejan en todo el sistema
  - [ ] No puedo cambiar el estado desde esta pantalla (hay acción separada)
```

### US-010 — Cambiar estado del campeonato
```
ID: US-010
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [cambiar el estado del campeonato] para [avanzarlo en su ciclo de vida].
Prioridad: Alta
Esfuerzo: S
Dependencias: US-007
Criterios de Aceptación:
  - [ ] Puedo cambiar a: INSCRIPCION, EN_CURSO, FINALIZADO, CANCELADO
  - [ ] Solo se permiten transiciones válidas (ej: BORRADOR → INSCRIPCION)
  - [ ] Si cambio a EN_CURSO, debe haber al menos 2 equipos inscritos
  - [ ] Si cancelo, se requiere un motivo
```

---

## Módulo: Categorías y Temporadas

### US-011 — Gestionar categorías
```
ID: US-011
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [agregar, editar y eliminar categorías en un campeonato] para [definir las divisiones del torneo].
Prioridad: Alta
Esfuerzo: S
Dependencias: US-007
Criterios de Aceptación:
  - [ ] Puedo crear categorías con nombre y descripción
  - [ ] Las categorías pertenecen a un campeonato
  - [ ] No puedo eliminar una categoría con temporadas activas
```

### US-012 — Gestionar temporadas
```
ID: US-012
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [crear temporadas dentro de una categoría] para [definir los períodos de juego].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-011
Criterios de Aceptación:
  - [ ] Puedo crear temporada con nombre, fecha inicio, fecha fin
  - [ ] La temporada se crea en estado PROXIMA
  - [ ] Puedo cambiar el estado a INSCRIPCION, ACTIVA, FINALIZADA
  - [ ] Una categoría puede tener múltiples temporadas
```

---

## Módulo: Equipos

### US-013 — Inscribir equipo
```
ID: US-013
Rol: DELEGATE, ADMIN
Historia: Como [delegado], quiero [inscribir mi equipo en una temporada con nombre, escudo y colores] para [participar en el campeonato].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-012
Criterios de Aceptación:
  - [ ] Selecciono la temporada y categoría disponible
  - [ ] Ingreso nombre (obligatorio), escudo y colores (opcionales)
  - [ ] Quedo automáticamente asignado como delegado principal del equipo
  - [ ] El nombre debe ser único dentro de la temporada
```

### US-014 — Ver equipos de una temporada
```
ID: US-014
Rol: Todos
Historia: Como [usuario], quiero [ver los equipos inscritos en una temporada] para [conocer los participantes del torneo].
Prioridad: Alta
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Veo todos los equipos con su escudo, nombre y cantidad de jugadores
  - [ ] Puedo filtrar por categoría
  - [ ] Puedo hacer clic en un equipo para ver su detalle
```

### US-015 — Editar equipo
```
ID: US-015
Rol: ADMIN, DELEGATE (propio)
Historia: Como [delegado], quiero [editar los datos de mi equipo] para [actualizar escudo, colores o nombre].
Prioridad: Media
Esfuerzo: S
Dependencias: US-013
Criterios de Aceptación:
  - [ ] Puedo cambiar nombre, escudo, colores
  - [ ] Un ADMIN puede editar cualquier equipo
  - [ ] Un DELEGATE solo puede editar su propio equipo
```

### US-016 — Eliminar equipo
```
ID: US-016
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [eliminar un equipo de una temporada] para [remover equipos que no cumplen los requisitos].
Prioridad: Media
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Solo ADMIN/SUPER_ADMIN pueden eliminar equipos
  - [ ] No se puede eliminar un equipo con partidos jugados
  - [ ] Se pide confirmación antes de eliminar
  - [ ] Si se elimina, los jugadores quedan sin equipo
```

---

## Módulo: Jugadores

### US-017 — Registrar jugador
```
ID: US-017
Rol: ADMIN, DELEGATE
Historia: Como [delegado], quiero [registrar un jugador en mi equipo con sus datos personales] para [tener la plantilla completa].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-013
Criterios de Aceptación:
  - [ ] Ingreso nombre, apellido, DNI, fecha nacimiento, teléfono, email
  - [ ] Ingreso número de camiseta y posición
  - [ ] Puedo subir una foto del jugador
  - [ ] El DNI debe ser único en el sistema
  - [ ] El número de camiseta debe ser único dentro del equipo
```

### US-018 — Ver jugadores de un equipo
```
ID: US-018
Rol: Todos
Historia: Como [usuario], quiero [ver la lista de jugadores de un equipo] para [conocer su plantilla].
Prioridad: Alta
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Veo foto, nombre, número, posición y estado de cada jugador
  - [ ] Puedo ordenar por número de camiseta o nombre
  - [ ] Puedo buscar por nombre o DNI
```

### US-019 — Editar jugador
```
ID: US-019
Rol: ADMIN, DELEGATE
Historia: Como [delegado], quiero [editar los datos de un jugador de mi equipo] para [corregir información o actualizarla].
Prioridad: Media
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Puedo modificar todos los datos del jugador excepto DNI
  - [ ] Un ADMIN puede editar cualquier jugador
  - [ ] Un DELEGATE solo puede editar jugadores de su equipo
```

### US-020 — Desactivar jugador
```
ID: US-020
Rol: ADMIN, DELEGATE
Historia: Como [delegado], quiero [desactivar un jugador de mi equipo] para [indicar que ya no forma parte de la plantilla].
Prioridad: Media
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Al desactivar, el jugador no aparece en el equipo
  - [ ] El jugador no puede participar en nuevos partidos
  - [ ] El historial del jugador se conserva
  - [ ] Se puede reactivar posteriormente
```

---

## Módulo: Fixture y Partidos

### US-021 — Generar fixture automático
```
ID: US-021
Rol: ADMIN
Historia: Como [administrador], quiero [generar automáticamente el fixture de la temporada] para [tener el calendario de partidos sin hacerlo manualmente].
Prioridad: Alta
Esfuerzo: L
Dependencias: US-013
Criterios de Aceptación:
  - [ ] Selecciono el tipo de fixture (LIGA_IDA)
  - [ ] El sistema genera N-1 jornadas con partidos balanceados
  - [ ] Todos los equipos se enfrentan exactamente una vez
  - [ ] El fixture se crea en estado BORRADOR
  - [ ] Puedo ver el fixture generado antes de publicarlo
```

### US-022 — Publicar fixture
```
ID: US-022
Rol: ADMIN
Historia: Como [administrador], quiero [publicar el fixture generado] para [que los equipos y árbitros conozcan el calendario].
Prioridad: Alta
Esfuerzo: S
Dependencias: US-021
Criterios de Aceptación:
  - [ ] Al publicar, el fixture cambia a estado PUBLICADO
  - [ ] Los delegados reciben una notificación
  - [ ] No se puede publicar si hay partidos sin fecha asignada
```

### US-023 — Ver fixture por jornadas
```
ID: US-023
Rol: Todos
Historia: Como [usuario], quiero [ver el fixture organizado por jornadas] para [conocer los próximos partidos].
Prioridad: Alta
Esfuerzo: M
Criterios de Aceptación:
  - [ ] Veo las jornadas con sus partidos, fechas, horarios y canchas
  - [ ] Puedo navegar entre jornadas (anterior/siguiente)
  - [ ] Los resultados se muestran en partidos ya jugados
  - [ ] Los partidos tienen indicador de estado visual
```

### US-024 — Registrar resultado de partido
```
ID: US-024
Rol: REFEREE, ADMIN
Historia: Como [árbitro], quiero [registrar el resultado de un partido] para [actualizar la tabla de posiciones].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-021
Criterios de Aceptación:
  - [ ] Ingreso goles del equipo local y visitante
  - [ ] Solo puedo registrar resultados de partidos que me asignaron
  - [ ] Un ADMIN puede registrar cualquier partido
  - [ ] Al guardar, el partido pasa a FINALIZADO
  - [ ] La tabla de posiciones se actualiza automáticamente
```

### US-025 — Corregir resultado
```
ID: US-025
Rol: ADMIN
Historia: Como [administrador], quiero [corregir el resultado de un partido ya finalizado] para [subsanar errores de registro].
Prioridad: Media
Esfuerzo: S
Dependencias: US-024
Criterios de Aceptación:
  - [ ] Solo ADMIN puede corregir resultados
  - [ ] La corrección queda registrada en AuditLog
  - [ ] La tabla de posiciones se recalcula con el nuevo resultado
```

### US-026 — Suspender partido
```
ID: US-026
Rol: ADMIN, REFEREE
Historia: Como [árbitro], quiero [suspender un partido] para [indicar que no se pudo jugar por alguna razón].
Prioridad: Media
Esfuerzo: S
Criterios de Aceptación:
  - [ ] Puedo cambiar el estado a SUSPENDIDO
  - [ ] Debo ingresar el motivo de la suspensión
  - [ ] Un ADMIN puede reprogramar el partido posteriormente
```

---

## Módulo: Tabla de Posiciones

### US-027 — Ver tabla de posiciones
```
ID: US-027
Rol: Todos
Historia: Como [usuario], quiero [ver la tabla de posiciones actualizada] para [conocer la clasificación de los equipos].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-024
Criterios de Aceptación:
  - [ ] La tabla muestra #, equipo, PJ, PG, PE, PP, GF, GC, DG, puntos
  - [ ] Los equipos se ordenan por puntos (desc), luego DG, luego GF
  - [ ] Se actualiza automáticamente al registrar resultados
  - [ ] Puedo filtrar por categoría
  - [ ] Puedo exportar a PDF y Excel
```

---

## Módulo: Tarjetas y Sanciones

### US-028 — Registrar tarjeta en un partido
```
ID: US-028
Rol: REFEREE, ADMIN
Historia: Como [árbitro], quiero [registrar tarjetas amarillas y rojas durante un partido] para [llevar el control disciplinario].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-024
Criterios de Aceptación:
  - [ ] Selecciono jugador, tipo de tarjeta (amarilla, roja) y minuto
  - [ ] Puedo registrar múltiples tarjetas en un mismo partido
  - [ ] Se muestra el total de tarjetas del partido
```

### US-029 — Ver sanciones automáticas por acumulación
```
ID: US-029
Rol: ADMIN
Historia: Como [administrador], quiero [que el sistema calcule automáticamente las sanciones por acumulación de tarjetas] para [no tener que hacerlo manualmente].
Prioridad: Alta
Esfuerzo: M
Dependencias: US-028
Criterios de Aceptación:
  - [ ] Al llegar a 5 amarillas, se genera suspensión automática de 1 partido
  - [ ] Doble amarilla en un partido genera suspensión de 1 partido
  - [ ] El ADMIN puede revisar y confirmar la sanción automática
  - [ ] El jugador queda marcado como suspendido
```

### US-030 — Aplicar sanción manual
```
ID: US-030
Rol: ADMIN
Historia: Como [administrador], quiero [aplicar una sanción manual a un jugador] para [suspenderlo por falta grave no cubierta por reglas automáticas].
Prioridad: Alta
Esfuerzo: M
Criterios de Aceptación:
  - [ ] Selecciono jugador, tipo de sanción, fechas y motivo
  - [ ] La sanción se marca como activa inmediatamente
  - [ ] El jugador no puede ser convocado mientras tenga sanción activa
  - [ ] Queda registrado en el historial del jugador
```

### US-031 — Revocar sanción
```
ID: US-031
Rol: SUPER_ADMIN
Historia: Como [SUPER_ADMIN], quiero [revocar una sanción aplicada] para [atender apelaciones justificadas].
Prioridad: Media
Esfuerzo: S
Dependencias: US-030
Criterios de Aceptación:
  - [ ] Puedo revocar sanciones automáticas y manuales
  - [ ] Debo ingresar el motivo de la revocación
  - [ ] La revocación queda registrada en AuditLog
```

---

## Módulo: Carnets

### US-032 — Generar carnet digital con QR
```
ID: US-032
Rol: ADMIN
Historia: Como [administrador], quiero [generar un carnet digital con código QR para cada jugador] para [que puedan identificarse fácilmente en los partidos].
Prioridad: Alta
Esfuerzo: L
Dependencias: US-017
Criterios de Aceptación:
  - [ ] Selecciono un jugador y genero su carnet
  - [ ] El carnet incluye foto, nombre, DNI, equipo, número y QR único
  - [ ] El QR contiene un hash que identifica al jugador
  - [ ] Puedo descargar el carnet como imagen o PDF
  - [ ] Puedo imprimir el carnet directamente
```

### US-033 — Validar carnet por QR
```
ID: US-033
Rol: Público (sin auth)
Historia: Como [organizador], quiero [escannear el código QR del carnet de un jugador] para [verificar que está habilitado para jugar].
Prioridad: Alta
Esfuerzo: L
Dependencias: US-032
Criterios de Aceptación:
  - [ ] Abro la página de validación desde cualquier dispositivo
  - [ ] Escaneo el QR con la cámara o ingreso el código manualmente
  - [ ] Si el carnet es válido, veo los datos del jugador en verde
  - [ ] Si el carnet es inválido (suspendido, vencido), veo el motivo en rojo
  - [ ] No requiere iniciar sesión
```

### US-034 — Suspender carnet
```
ID: US-034
Rol: ADMIN
Historia: Como [administrador], quiero [suspender el carnet de un jugador sancionado] para [que no pueda presentarlo como válido].
Prioridad: Media
Esfuerzo: S
Dependencias: US-032, US-030
Criterios de Aceptación:
  - [ ] Al aplicar una sanción, el carnet se suspende automáticamente
  - [ ] Puedo suspender manualmente un carnet
  - [ ] Un carnet suspendido no pasa la validación QR
  - [ ] Al levantar la sanción, el carnet se reactiva
```

---

## Módulo: Dashboard y Reportes

### US-035 — Ver dashboard del campeonato
```
ID: US-035
Rol: ADMIN, SUPER_ADMIN
Historia: Como [administrador], quiero [ver un dashboard con indicadores clave del campeonato] para [tener una visión general del estado del torneo].
Prioridad: Media
Esfuerzo: L
Criterios de Aceptación:
  - [ ] Veo cards con total de equipos, jugadores, partidos y sanciones
  - [ ] Veo los próximos 5 partidos programados
  - [ ] Veo los últimos resultados registrados
  - [ ] Veo el top 3 de goleadores
  - [ ] Los datos se actualizan en tiempo real
```

---

## Resumen de Historias por Módulo

| Módulo | Historias | IDs |
|--------|-----------|-----|
| Autenticación y Usuarios | 6 | US-001 a US-006 |
| Campeonatos | 4 | US-007 a US-010 |
| Categorías y Temporadas | 2 | US-011 a US-012 |
| Equipos | 4 | US-013 a US-016 |
| Jugadores | 4 | US-017 a US-020 |
| Fixture y Partidos | 6 | US-021 a US-026 |
| Tabla de Posiciones | 1 | US-027 |
| Tarjetas y Sanciones | 4 | US-028 a US-031 |
| Carnets | 3 | US-032 a US-034 |
| Dashboard y Reportes | 1 | US-035 |
| **Total** | **35** | **US-001 a US-035** |

---

## Resumen por Rol

| Rol | Cantidad de Historias |
|-----|----------------------|
| SUPER_ADMIN | 3 |
| ADMIN | 18 |
| DELEGATE | 7 |
| REFEREE | 3 |
| VIEWER / Público | 5 |
| Todos | 8 |

*Nota: Algunas historias involucran múltiples roles.*

---

*Historias de Usuario — Campeonato v1.0.0*
