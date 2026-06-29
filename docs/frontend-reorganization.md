# Reorganizacion del frontend

## Nueva estructura

El frontend quedo organizado por dominios en `src/features` y la logica reutilizable en `src/lib/domain` y `src/lib/queries`.

- `src/features/public`: home publica, selector de campeonato, resumen, render por formato y modales publicos.
- `src/features/fixture`: timeline del dia, vista por cancha, tarjetas de partido y badges de conflicto.
- `src/features/brackets`: llave dinamica, tercer lugar, grupos y tabla de posiciones.
- `src/features/teams`: tarjetas de equipo, delegado, roster y tabla de jugadores.
- `src/features/bases`: bases oficiales como pagina web estructurada y boton para PDF.
- `src/features/delegate`: dashboard, inscripcion, plantel, partidos, avisos y selector de equipo.
- `src/features/admin`: dashboard, wizard de campeonato, revision de equipos, fixture, resultados y configuracion.
- `src/lib/domain`: formato de torneo, generador de llaves, slots de un dia, conflictos, posiciones, permisos y reglas de inscripcion.
- `src/lib/queries`: selectores de datos para publico, delegado y admin sobre `CompetitionData`.

La app ya no conserva wrappers de rutas antiguas. `src/components` queda solo para piezas transversales compartidas: shell, auth, UI y formulario de inscripcion.

## Rutas publicas

Menu publico visible:

- `/`: Inicio
- `/c/default/fixture`: Fixture del dia
- `/c/default/bases`: Bases
- `/c/default/registro`: Inscribir equipo

Rutas por campeonato:

- `/c/[championshipSlug]`
- `/c/[championshipSlug]/fixture`
- `/c/[championshipSlug]/bases`
- `/c/[championshipSlug]/registro`

El slug `default` resuelve al primer campeonato publico disponible cuando se usa desde la navegacion global. Desde la home, los botones del hero generan links canonicos con el slug real del campeonato seleccionado.

Rutas antiguas eliminadas para evitar confusiones:

- `/campeonato/*`
- `/equipos`
- `/equipo`
- `/registro`

## Rutas delegado

Menu delegado visible:

- `/delegado`: Resumen
- `/delegado/inscripcion`: Mi inscripcion
- `/delegado/plantel`: Plantel
- `/delegado/partidos`: Mis partidos
- `/delegado/avisos`: Avisos y bases

El panel usa el correo de sesion para filtrar equipos. Si el delegado tiene mas de un equipo, aparece un selector de equipo.

## Rutas admin

Menu admin visible:

- `/admin`: Resumen
- `/admin/campeonatos`: Campeonatos
- `/admin/equipos`: Inscripciones
- `/admin/fixture`: Fixture
- `/admin/resultados`: Resultados
- `/admin/configuracion`: Configuracion

Subrutas:

- `/admin/campeonatos/nuevo`: wizard de creacion.
- `/admin/campeonatos/[id]`: configuracion del campeonato.
- `/admin/bases`: carga/preparacion de bases.

Rutas admin antiguas eliminadas:

- `/admin/eventos`
- `/admin/ia`

## Componentes principales

- `PublicHome`: vista publica principal.
- `ChampionshipHero`: titulo con selector de campeonato.
- `ChampionshipSwitcher`: selector de campeonatos activos/publicables.
- `FormatRenderer`: decide si mostrar liga, eliminacion directa o grupos + eliminacion.
- `TeamDetailsModal`: modal publico reutilizable de equipo sin DNI ni documentos.
- `DaySchedule`: fixture del dia con filtros por campeonato, cancha, equipo y estado.
- `KnockoutBracket`: llave dinamica para 2, 4, 8, 10, 12, 16 equipos y byes.
- `DelegateDashboard`: workspace delegado para todas sus subrutas.
- `ChampionshipWizard`: wizard admin por pasos.
- `FixtureGenerationPanel`: vista admin para generar/revisar fixture y conflictos.

## Reglas de navegacion

La navegacion publica se redujo a cuatro entradas. Equipos, grupos, posiciones y playoffs se muestran dentro del campeonato seleccionado. No hay menu ni rutas publicas separadas para esos conceptos.

El usuario publico cambia el campeonato desde el selector junto al titulo. Ese cambio recalcula equipos, partidos, bases, tabla, grupos y llaves usando el contexto del campeonato seleccionado.

## Reglas de edicion para delegados

Los helpers de permisos viven en `src/lib/domain/permissions.ts`.

- `canEditRegistration(event, team)` permite editar si el campeonato esta en `registration` y `registrationOpenUntil` no vencio.
- `canEditRoster(event, team)` usa la misma ventana de inscripcion.
- `canViewPrivateTeamData(user, team)` reserva datos sensibles para admin o delegado del equipo.
- El publico no ve DNI, documentos ni codigos universitarios en `TeamDetailsModal`.
- Despues del cierre, las pantallas de delegado quedan en modo solo lectura.

## Formatos de torneo

`FormatRenderer` aplica:

- `league`: tabla general y proximos partidos.
- `single_elimination`: llave dinamica.
- `groups_then_knockout`: grupos/clasificados y llave final.

`src/lib/domain/bracket-generator.ts` calcula la potencia de 2 siguiente, byes y rondas preliminares. Si ya existen partidos de playoff, usa esos partidos; si no existen, crea una estructura visual preliminar.

## Scheduler y conflictos

`src/lib/domain/schedule-generator.ts` genera slots de un dia por cancha, hora inicial, hora final, duracion y descanso.

`src/lib/domain/conflict-detector.ts` detecta:

- cancha duplicada a la misma hora,
- equipo en dos partidos simultaneos,
- jugador repetido con cruce,
- descanso insuficiente.

El admin ve los conflictos en `FixtureGenerationPanel` y el publico/delegado los recibe como alertas simples en tarjetas de partido o panel delegado.

## Supabase y mocks

La app sigue entrando por `getPublicCompetitionData()`. Si no hay variables de Supabase, mantiene `withRepositoryFootballDefaults(emptyCompetitionData)` y datos mock. Las nuevas features consumen `CompetitionData`, por lo que funcionan con Supabase, datos legacy y mocks.

## Pendientes reales

- Persistencia completa del wizard de campeonatos paso a paso en Supabase.
- Extraccion automatica de texto desde PDF de bases.
- Edicion real de inscripcion/plantel desde panel delegado; la UI y permisos estan preparados.
- Ajuste manual persistente de fixture desde admin.
- Validacion global de duplicado de codigo universitario contra tablas reales cuando el backend exponga esa consulta.
