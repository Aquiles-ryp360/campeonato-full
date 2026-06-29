# Configuracion admin de campeonatos

## Crear campeonato

El admin debe configurar datos generales:

- Nombre.
- Deporte.
- Rama/categoria.
- Fecha.
- Estado.
- Descripcion.

La pantalla base es `src/features/admin/components/ChampionshipWizard.tsx`.

## Formato

Formatos previstos:

- Liga por puntos.
- Eliminacion directa.
- Grupos + eliminacion.

Para eliminacion directa se configuran:

- Maximo de equipos.
- Criterio de sembrado: sorteo aleatorio, orden de inscripcion, manual o ranking.
- Permitir byes.
- Partido por tercer lugar.
- Penales en empate.

El motor activo para eliminacion directa esta en `src/lib/domain/bracket-generator.ts`.

## Horario

El admin no programa partido por partido. Solo define:

- Hora de inicio.
- Duracion del partido.
- Canchas disponibles.
- Transicion entre partidos.
- Descanso minimo.
- Permitir fixture compacto preliminar.

`src/lib/domain/schedule-generator.ts` genera los slots, asigna canchas y ordena rondas.

## Fixture

El panel admin muestra:

- Ver fixture preliminar.
- Regenerar preliminar.
- Congelar revision.
- Publicar fixture.
- Bloquear fixture.
- Ver conflictos.

Estados:

- `draft_auto`: se puede regenerar automaticamente.
- `draft_review`: no cambia solo; admin revisa.
- `published`: oficial; no se regenera automaticamente.
- `locked`: cerrado.

Los conflictos se calculan en `src/lib/domain/conflict-detector.ts` y devuelven:

```ts
{
  type: string,
  severity: "info" | "warning" | "error",
  message: string,
  affectedMatchIds: string[],
  affectedTeamIds: string[],
  affectedPlayerIds: string[],
  suggestion: string
}
```

## Bases

El admin puede preparar:

- PDF oficial.
- Texto manual o texto extraido.
- Publicacion de bases.

La extraccion automatica de PDF queda como pendiente de backend, pero la UI y el modelo de componentes ya estan preparados.

## Futuros formatos

Liga por puntos:

- Reusar generador round-robin existente en `src/lib/scheduler.ts` o moverlo a `src/lib/domain`.
- Aplicar horarios con `generateOneDaySchedule`.
- Publicar tabla con `standings.ts`.

Grupos + eliminacion:

- Generar grupos.
- Generar partidos de grupos.
- Calcular clasificados.
- Pasar clasificados al motor de eliminacion directa.

## Supabase

Para persistir fixture automatico con placeholders y lifecycle se agrego:

- `supabase/migrations/009_fixture_automation.sql`

Sin esa migracion, el modo mock sigue mostrando el flujo completo, pero Supabase no puede almacenar todos los partidos futuros con `Ganador P1` porque el esquema antiguo exigia equipos reales en ambos lados.

Las vistas publicas usan datos de jugadores saneados. Admin y delegado solicitan campos privados explicitamente para revisar planteles, pero esos campos no viajan en `/` ni en `/c/[championshipSlug]`.

Para pasar Supabase a limpio:

1. Aplicar `supabase/migrations/009_fixture_automation.sql`.
2. Ejecutar `RESET_SERVER_DATA=true npm run seed`.
3. Correr `npm run validate:fixture`.

El seed preserva los correos de `admin_emails` y no toca usuarios/auth.
