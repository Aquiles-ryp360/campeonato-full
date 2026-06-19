# Plan V0 - Campeonato Carreras

## Objetivo

Construir desde cero una web desplegable en Vercel con Supabase para gestionar campeonatos internos por carrera.

La version anterior del repo quedo guardada en `referencia-1/`.

## Alcance de esta v0

- Portal publico con eventos, fixture, resultados y tabla.
- Registro autonomo de equipos para eventos configurados por el admin.
- Eventos configurables por deporte, categoria y formato:
  - Futsal varones.
  - Voley mixto.
  - Liga por puntos.
  - Eliminacion directa.
  - Grupos + eliminacion.
- Inscripcion con pago de S/ 40 por equipo via Yape o Plin.
- Panel del delegado para ver estado de pago, jugadores y partidos.
- Panel admin para eventos, pagos, equipos y resultados.
- Flujo de audio IA: audio -> transcripcion -> JSON revisable -> publicar.

## Pago Yape/Plin con codigos

El cobro sera manual. El encargado cobra por Yape o Plin y entrega un codigo de inscripcion de un solo uso.

Flujo:

1. Admin crea un lote de codigos para un evento, por ejemplo 10 codigos para 10 equipos.
2. El encargado cobra S/ 40 por Yape o Plin.
3. El encargado entrega un codigo al delegado.
4. El delegado inscribe su equipo usando ese codigo.
5. La base valida que el codigo exista, pertenezca al evento y no este usado.
6. Al completar la inscripcion, el codigo queda marcado como `used`.

La base evita que un codigo inscriba dos equipos:

- `registration_codes` tiene `unique (event_id, code)`.
- `registration_codes.used_by_team_id` tiene indice unico cuando no es null.

## Datos del jugador

Campos requeridos:

- DNI.
- Codigo universitario.
- Ficha de matricula como PDF o imagen.
- Ciclo o semestre.
- Foto opcional.

Un jugador puede estar en dos deportes/eventos. La app no lo bloquea; la asistencia queda bajo responsabilidad del jugador/equipo.

## Audio IA

Flujo previsto:

1. Admin sube audio o nota de voz.
2. Backend transcribe el audio.
3. Un modelo extrae:
   - Partido.
   - Equipo ganador.
   - Marcador.
   - Goles.
   - Tarjetas.
   - Observaciones.
4. Se guarda un borrador en `audio_result_drafts`.
5. Admin revisa y presiona publicar.
6. Se actualiza `matches`, `match_goals`, `match_cards` y la tabla publica.

## Roles

- `admin`: configura eventos, revisa pagos, maneja fixture/resultados e IA.
- `delegate`: gestiona su equipo y jugadores.
- `viewer`: puede ver fixture y tabla.

## Siguiente fase

1. Conectar Supabase Auth.
2. Reemplazar datos mock por queries Supabase.
3. Implementar server actions para crear equipo/jugadores.
4. Implementar transaccion de pago/registro.
5. Crear generador de fixture.
6. Conectar transcripcion e IA.
7. Agregar tests de reglas criticas.
