# Casos de Uso Detallados

> **Versión:** 1.0.0  
> **Última actualización:** Junio 2026

---

## Índice de Casos de Uso

| # | Caso de Uso | Actor Principal |
|---|-------------|-----------------|
| 1 | [Registrar Campeonato](#uc-01-registrar-campeonato) | ADMIN |
| 2 | [Inscribir Equipo](#uc-02-inscribir-equipo) | DELEGATE |
| 3 | [Generar Fixture](#uc-03-generar-fixture) | ADMIN |
| 4 | [Registrar Resultado](#uc-04-registrar-resultado) | REFEREE |
| 5 | [Visualizar Tabla de Posiciones](#uc-05-visualizar-tabla-de-posiciones) | VIEWER |
| 6 | [Aplicar Sanción](#uc-06-aplicar-sanción) | ADMIN |
| 7 | [Generar Carnet Digital](#uc-07-generar-carnet-digital) | ADMIN |
| 8 | [Validar Carnet (QR Scan)](#uc-08-validar-carnet-qr-scan) | Público |
| 9 | [Generar Reporte](#uc-09-generar-reporte) | ADMIN |
| 10 | [Modificar Fixture Manualmente](#uc-10-modificar-fixture-manualmente) | ADMIN |

---

## UC-01: Registrar Campeonato

| Campo | Detalle |
|-------|---------|
| **ID** | UC-01 |
| **Nombre** | Registrar Campeonato |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | - |
| **Disparador** | El ADMIN desea crear un nuevo torneo en el sistema |
| **Precondiciones** | El ADMIN ha iniciado sesión con rol `ADMIN` o `SUPER_ADMIN` |

### Flujo Principal

1. El ADMIN navega a "Campeonatos" → "Nuevo Campeonato"
2. El sistema muestra el formulario de creación con los campos: nombre, descripción, tipo, logo
3. El ADMIN completa los campos obligatorios (*nombre*, *tipo*)
4. El ADMIN hace clic en "Guardar"
5. El sistema valida los datos:
   - Nombre no vacío (1–200 caracteres)
   - Tipo válido (`LIGA`, `COPA`, `TORNEO`, `AMISTOSO`)
6. El sistema persiste el campeonato con estado `BORRADOR`
7. El sistema registra en AuditLog: `{ action: "CREATE", entityType: "Campeonato", entityId }`
8. El sistema retorna el campeonato creado y redirige a la vista de detalle

### Postcondiciones
- Campeonato creado en estado `BORRADOR`
- Queda registrado en el log de auditoría

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 5a | **Datos inválidos:** El sistema muestra errores de validación en rojo debajo de cada campo, el ADMIN corrige y reenvía |
| 5b | **Nombre duplicado:** El sistema muestra "Ya existe un campeonato con ese nombre" |
| 4a | **Cancelar:** El ADMIN hace clic en "Cancelar", el sistema descarta los datos y vuelve al listado |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-01 | El nombre del campeonato debe ser único |
| RN-02 | Solo ADMIN y SUPER_ADMIN pueden crear campeonatos |
| RN-03 | El campeonato se crea siempre en estado `BORRADOR` |
| RN-04 | El logo es opcional, si no se provee se usa un placeholder |

---

## UC-02: Inscribir Equipo

| Campo | Detalle |
|-------|---------|
| **ID** | UC-02 |
| **Nombre** | Inscribir Equipo |
| **Actor Principal** | DELEGATE |
| **Actores Secundarios** | ADMIN (aprobación) |
| **Disparador** | Un delegado desea registrar su equipo en una temporada |
| **Precondiciones** | - El DELEGATE ha iniciado sesión<br>- Existe una temporada en estado `INSCRIPCION`<br>- El DELEGATE no tiene otro equipo en la misma temporada |

### Flujo Principal

1. El DELEGATE navega a "Equipos" → "Inscribir Equipo"
2. El sistema muestra el formulario con campos: nombre, escudo, colores, temporada, categoría
3. El DELEGATE selecciona temporada y categoría (de las disponibles)
4. El DELEGATE completa nombre y datos opcionales
5. El DELEGATE hace clic en "Guardar"
6. El sistema valida que la temporada esté en estado `INSCRIPCION`
7. El sistema valida que el nombre del equipo no exista en esa temporada
8. El sistema crea el equipo con estado pendiente (si requiere aprobación) o directamente activo
9. El sistema registra en AuditLog

### Postcondiciones
- Equipo creado y asociado a la temporada + categoría
- El DELEGATE queda vinculado al equipo como delegado principal

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 6a | **Temporada no disponible:** El sistema muestra "La temporada no está en período de inscripción" |
| 7a | **Nombre duplicado:** "Ya existe un equipo con ese nombre en esta temporada" |
| 3a | **Sin temporadas:** El sistema muestra "No hay temporadas abiertas para inscripción" |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-05 | Solo se puede inscribir un equipo por temporada por DELEGATE |
| RN-06 | El nombre del equipo debe ser único dentro de la misma temporada |
| RN-07 | La temporada debe estar en estado `INSCRIPCION` para aceptar equipos |
| RN-08 | Opcionalmente, el ADMIN puede requerir aprobación manual de cada inscripción |

---

## UC-03: Generar Fixture

| Campo | Detalle |
|-------|---------|
| **ID** | UC-03 |
| **Nombre** | Generar Fixture |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | Sistema (algoritmo de generación) |
| **Disparador** | El ADMIN desea generar el calendario de partidos de una temporada |
| **Precondiciones** | - ADMIN autenticado<br>- Temporada con al menos 2 equipos inscritos<br>- Temporada en estado `ACTIVA` o `PROXIMA` |

### Flujo Principal

1. El ADMIN navega al detalle de la temporada → "Generar Fixture"
2. El sistema muestra las opciones de tipo de fixture:
   - LIGA_IDA, LIGA_IDA_VUELTA, ELIMINATORIA_DIRECTA, etc.
3. El ADMIN selecciona **LIGA_IDA**
4. El ADMIN configura parámetros: fecha de inicio estimada, nombre del fixture
5. El ADMIN hace clic en "Generar"
6. El sistema ejecuta el algoritmo round-robin:
   - Para N equipos, genera N-1 jornadas (o N si es impar)
   - Cada jornada tiene N/2 partidos
7. El sistema asigna equipos local/visitante alternando
8. El sistema crea el fixture en estado `BORRADOR` con todos los partidos
9. El sistema muestra el fixture generado para revisión

### Postcondiciones
- Fixture creado en estado `BORRADOR`
- Todos los partidos generados sin fechas, horarios ni canchas asignadas

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 6a | **Menos de 2 equipos:** El sistema muestra "Se necesitan al menos 2 equipos" |
| 3a | **Cancelar:** El ADMIN vuelve atrás sin generar |
| 8a | **Error de algoritmo:** Si el número de equipos cambia entre la selección y la generación, se muestra error |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-09 | Todos los equipos de la temporada se incluyen automáticamente |
| RN-10 | El fixture se genera en estado `BORRADOR`, debe publicarse manualmente |
| RN-11 | El algoritmo round-robin asegura que todos los equipos se enfrenten exactamente una vez (LIGA_IDA) |
| RN-12 | Los partidos se distribuyen uniformemente entre las jornadas |
| RN-13 | No se puede regenerar si ya existen resultados registrados |

---

## UC-04: Registrar Resultado

| Campo | Detalle |
|-------|---------|
| **ID** | UC-04 |
| **Nombre** | Registrar Resultado |
| **Actor Principal** | REFEREE |
| **Actores Secundarios** | ADMIN (corrección) |
| **Disparador** | Finaliza un partido y el árbitro debe registrar el resultado |
| **Precondiciones** | - REFEREE autenticado<br>- Partido en estado `PROGRAMADO` o `EN_CURSO`<br>- El REFEREE está asignado al partido |

### Flujo Principal

1. El REFEREE navega a "Mis Partidos" → selecciona el partido
2. El sistema muestra los datos del partido: equipos, fecha, cancha
3. El REFEREE hace clic en "Registrar Resultado"
4. El sistema muestra el formulario: goles local, goles visitante, observaciones
5. El REFEREE ingresa los goles y observaciones opcionales
6. El REFEREE hace clic en "Guardar"
7. El sistema valida:
   - Goles >= 0
   - Goles son números enteros
8. El sistema actualiza el partido:
   - `golesLocal = X`, `golesVisitante = Y`
   - `estado = FINALIZADO`
9. El sistema actualiza la tabla de posiciones:
   - Suma PJ a ambos equipos
   - Suma PG/PE/PP según resultado
   - Suma GF, GC, calcula DG y puntos
10. El sistema registra en AuditLog

### Postcondiciones
- Partido finalizado con resultado registrado
- Tabla de posiciones actualizada
- Si hay sanciones automáticas pendientes, se calculan

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 5a | **Walkover:** Si un equipo no se presenta, el ADMIN/REFEREE marca WALKOVER (goles 3-0 automático) |
| 7a | **Datos inválidos:** Goles negativos no permitidos |
| 5b | **Suspender partido:** El REFEREE puede cambiar el estado a `SUSPENDIDO` si el partido no se juega |
| 8a | **Corrección:** Solo un ADMIN puede modificar un resultado ya registrado |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-14 | Un partido solo puede tener un resultado final |
| RN-15 | El resultado debe tener goles >= 0 para ambos equipos |
| RN-16 | Si el partido es WALKOVER, se registra 3-0 automáticamente |
| RN-17 | Al finalizar el partido, la tabla de posiciones se actualiza inmediatamente |
| RN-18 | Un ADMIN puede corregir un resultado, quedando registrado en AuditLog |

---

## UC-05: Visualizar Tabla de Posiciones

| Campo | Detalle |
|-------|---------|
| **ID** | UC-05 |
| **Nombre** | Visualizar Tabla de Posiciones |
| **Actor Principal** | VIEWER |
| **Actores Secundarios** | - |
| **Disparador** | El usuario desea ver la clasificación de equipos en una temporada |
| **Precondiciones** | - Usuario autenticado (cualquier rol)<br>- Temporada con partidos registrados |

### Flujo Principal

1. El usuario navega a "Campeonato" → "Temporada" → "Tabla de Posiciones"
2. El sistema muestra la tabla con columnas: #, Equipo, PJ, PG, PE, PP, GF, GC, DG, Puntos
3. Los equipos se ordenan por:
   - 1° Puntos (descendente)
   - 2° Diferencia de gol (descendente)
   - 3° Goles a favor (descendente)
   - 4° Orden alfabético
4. El usuario puede filtrar por categoría (si hay múltiples)
5. El usuario puede ver el detalle de un equipo haciendo clic

### Postcondiciones
- El usuario visualiza la tabla correctamente ordenada

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 2a | **Sin partidos:** El sistema muestra "No hay partidos registrados aún" con un mensaje informativo |
| 5a | **Empate técnico:** Si dos equipos tienen los mismos puntos, DG y GF, se muestran en la misma posición |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-19 | Sistema de puntuación: 3 puntos por victoria, 1 por empate, 0 por derrota |
| RN-20 | El criterio de desempate es: 1) Puntos, 2) Diferencia de gol, 3) Goles a favor, 4) Resultado entre ellos |
| RN-21 | Un equipo con 0 partidos jugados aparece al final con 0 puntos |
| RN-22 | La tabla se actualiza en tiempo real al registrarse un resultado |

---

## UC-06: Aplicar Sanción

| Campo | Detalle |
|-------|---------|
| **ID** | UC-06 |
| **Nombre** | Aplicar Sanción |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | REFEREE (reporta), Sistema (automática) |
| **Disparador** | Un jugador acumula 5 tarjetas amarillas o recibe una roja directa |
| **Precondiciones** | - ADMIN autenticado<br>- Jugador registrado en el sistema<br>- Tarjeta registrada en un partido |

### Flujo Principal (Automático)

1. Al registrarse una tarjeta amarilla en un partido, el sistema verifica:
   - ¿El jugador acumula 5 amarillas en la temporada?
   - ¿Recibió doble amarilla en el mismo partido?
2. Si corresponde, el sistema crea automáticamente una sanción de suspensión:
   - 5ª amarilla → 1 partido de suspensión
   - Doble amarilla → 1 partido de suspensión
   - Roja directa → 1–3 partidos según gravedad
3. El sistema notifica al ADMIN y al DELEGATE del equipo

### Flujo Principal (Manual)

1. El ADMIN navega a "Sanciones" → "Nueva Sanción"
2. El sistema muestra el formulario: jugador, tipo, fechas, partidos, motivo
3. El ADMIN completa los datos y guarda
4. El sistema crea la sanción y la marca como activa
5. El sistema registra en AuditLog

### Postcondiciones
- Sanción creada y activa
- Si el jugador tiene carnet, se marca como `SUSPENDIDO`
- El jugador no puede participar en partidos durante el período de sanción

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 1a | **Apelación:** El ADMIN puede revocar una sanción si se presenta apelación |
| 2a | **Sobre sanción existente:** Si el jugador ya está suspendido, la nueva sanción se suma al final |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-23 | 5 tarjetas amarillas = 1 partido de suspensión automática |
| RN-24 | Doble amarilla en un partido = 1 partido de suspensión |
| RN-25 | Roja directa = mínimo 1 partido, evaluado por el ADMIN |
| RN-26 | Una sanción activa impide al jugador ser convocado a partidos |
| RN-27 | Las sanciones pueden ser apeladas y revocadas por SUPER_ADMIN |

---

## UC-07: Generar Carnet Digital

| Campo | Detalle |
|-------|---------|
| **ID** | UC-07 |
| **Nombre** | Generar Carnet Digital |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | Sistema (generación QR) |
| **Disparador** | El ADMIN necesita generar el carnet digital de un jugador |
| **Precondiciones** | - ADMIN autenticado<br>- Jugador registrado con foto<br>- Equipo y temporada activos |

### Flujo Principal

1. El ADMIN navega a "Jugadores" → selecciona jugador → "Generar Carnet"
2. El sistema muestra previsualización del carnet con datos del jugador
3. El ADMIN hace clic en "Confirmar y Generar"
4. El sistema:
   a. Genera un hash único para `codigoQR`
   b. Genera la imagen del código QR con el hash
   c. Crea el registro de carnet con estado `ACTIVO`
   d. Asigna fecha de vencimiento (fin de temporada)
5. El sistema muestra el carnet generado con opciones:
   - Ver en pantalla
   - Descargar PDF
   - Imprimir

### Postcondiciones
- Carnet digital creado con QR único
- El carnet queda disponible para descarga e impresión

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 4a | **Carnet existente:** Si ya existe un carnet activo, el sistema pregunta si desea renovarlo |
| 2a | **Sin foto:** El sistema genera el carnet sin foto pero advierte "Sin foto de jugador" |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-28 | Cada jugador tiene un único carnet activo por temporada |
| RN-29 | El código QR es un hash único irreversible |
| RN-30 | El carnet vence al finalizar la temporada |
| RN-31 | Un carnet suspendido no puede validarse |

---

## UC-08: Validar Carnet (QR Scan)

| Campo | Detalle |
|-------|---------|
| **ID** | UC-08 |
| **Nombre** | Validar Carnet mediante QR |
| **Actor Principal** | Público / Organizador |
| **Actores Secundarios** | Sistema de validación |
| **Disparador** | Una persona escanea el código QR del carnet de un jugador |
| **Precondiciones** | - Carnet generado y activo<br>- El escáner tiene acceso al endpoint público |

### Flujo Principal

1. El organizador abre el escáner QR (PWA o página web)
2. El organizador apunta la cámara al código QR del carnet
3. El sistema decodifica el hash del QR
4. El sistema envía el hash al endpoint `POST /api/v1/carnets/validar`
5. El sistema busca el carnet por `codigoQR`
6. El sistema verifica:
   - El carnet existe → OK
   - El carnet está en estado `ACTIVO` → OK
   - El carnet no está vencido → OK
7. El sistema responde con los datos del jugador:
   - Nombre completo, DNI, foto, equipo, temporada
8. El escáner muestra "CARNET VÁLIDO" en verde con los datos del jugador

### Postcondiciones
- El organizador confirma que el jugador está habilitado
- Queda registrada la validación (opcional)

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 6a | **Carnet no encontrado:** El sistema responde `404` y el escáner muestra "QR INVÁLIDO" en rojo |
| 6b | **Carnet suspendido:** El sistema responde que el carnet está suspendido y muestra el motivo |
| 6c | **Carnet vencido:** El sistema muestra "CARNET VENCIDO" con la fecha de vencimiento |
| 2a | **Error de escaneo:** El escáner muestra "No se pudo leer el código, intente nuevamente" |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-32 | El endpoint de validación es público (no requiere auth) |
| RN-33 | Solo se retornan datos si el carnet está ACTIVO y no vencido |
| RN-34 | El QR contiene solo el hash, no datos sensibles del jugador |

---

## UC-09: Generar Reporte

| Campo | Detalle |
|-------|---------|
| **ID** | UC-09 |
| **Nombre** | Generar Reporte |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | Sistema (generación PDF/Excel) |
| **Disparador** | El ADMIN necesita exportar datos del campeonato |
| **Precondiciones** | - ADMIN autenticado<br>- Existen datos para exportar |

### Flujo Principal (PDF)

1. El ADMIN navega a la sección que desea exportar (fixture, standings, sanciones)
2. El ADMIN hace clic en "Exportar PDF"
3. El sistema construye el documento PDF:
   - Encabezado con logo del campeonato y título
   - Tabla con datos formateados
   - Pie de página con fecha de generación
4. El sistema retorna el archivo PDF para descarga
5. El navegador descarga el archivo

### Flujo Principal (Excel)

1. El ADMIN navega a "Equipos" → "Exportar Excel"
2. El ADMIN hace clic en "Exportar"
3. El sistema genera el archivo Excel con:
   - Múltiples hojas si es necesario (ej: equipos + jugadores)
   - Formato de celdas (colores, bordes)
   - Filtros automáticos
4. El sistema retorna el archivo para descarga

### Postcondiciones
- Archivo descargado por el usuario
- No se modifica ningún dato del sistema

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 3a | **Sin datos:** El sistema genera el PDF/Excel con tabla vacía y mensaje "Sin datos disponibles" |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-35 | Los reportes incluyen siempre fecha y hora de generación |
| RN-36 | Los datos reflejan el estado actual del sistema al momento de generar |
| RN-37 | No se almacena una copia del reporte en el servidor (generación bajo demanda) |

---

## UC-10: Modificar Fixture Manualmente

| Campo | Detalle |
|-------|---------|
| **ID** | UC-10 |
| **Nombre** | Modificar Fixture Manualmente |
| **Actor Principal** | ADMIN |
| **Actores Secundarios** | - |
| **Disparador** | El ADMIN necesita ajustar el fixture generado automáticamente |
| **Precondiciones** | - ADMIN autenticado<br>- Fixture existe en estado `BORRADOR` o `PUBLICADO`<br>- Ningún partido del fixture tiene resultados registrados |

### Flujo Principal

1. El ADMIN navega al fixture → "Editar Fixture"
2. El sistema muestra el fixture completo con todos los partidos agrupados por jornada
3. El ADMIN puede realizar las siguientes operaciones:
   - **Intercambiar localía:** Cambiar qué equipo es local en un partido
   - **Mover partido:** Trasladar un partido a otra jornada
   - **Reordenar jornadas:** Cambiar el orden de las jornadas completas
   - **Agregar partido:** Insertar un partido adicional
   - **Eliminar partido:** Remover un partido del fixture
4. Por cada cambio, el sistema valida:
   - No duplicar enfrentamientos (en LIGA_IDA)
   - No dejar equipos sin partidos en una jornada
5. El ADMIN confirma los cambios → "Guardar Cambios"
6. El sistema persiste las modificaciones
7. El sistema registra en AuditLog: `{ action: "UPDATE", entityType: "Fixture", changes: [...] }`

### Postcondiciones
- Fixture modificado según los cambios realizados
- Si estaba `PUBLICADO`, se notifica a los delegados afectados

### Flujos Alternativos

| Paso | Variante |
|------|----------|
| 2a | **Fixture con resultados:** El sistema bloquea la edición y muestra "No se puede modificar un fixture con partidos jugados" |
| 4a | **Conflicto de programación:** Si se mueve un partido a una jornada con fecha ya pasada, el sistema advierte |
| 3a | **Cancelar:** El ADMIN descarta los cambios |

### Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| RN-38 | No se puede modificar un fixture con partidos que ya tienen resultado |
| RN-39 | Los cambios quedan registrados en el log de auditoría |
| RN-40 | Al modificar un fixture publicado, se debe notificar a los involucrados |
| RN-41 | No se pueden crear enfrentamientos duplicados en fixtures de tipo LIGA |

---

*Casos de Uso — Campeonato v1.0.0*
