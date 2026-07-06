# Fixture Futsal Varones 2026

## Que se implemento

Se implemento un escenario limpio de prueba para validar funcionalidad real:

- 1 campeonato: `Futsal Varones 2026`.
- 12 equipos.
- 12 delegados fake ligados por correo.
- 96 jugadores fake, 8 por equipo.
- Eliminacion directa con ronda preliminar automatica.
- Cuartos, semifinales, final y tercer lugar.
- Fixture preliminar generado automaticamente.
- Horarios generados desde hora de inicio, duracion y canchas.

La seed vive en `src/lib/futsal-10-seed.ts` y el mock visible en la app sale de `src/lib/mock-data.ts`.

La carga publica usa `getPublicCompetitionData()` en modo saneado por defecto: no selecciona ni serializa `dni` ni `enrollment_file` de jugadores. Las rutas admin/delegado piden esos campos de forma explicita con `includePrivatePlayerFields: true`.

## Ronda preliminar

Para eliminacion directa el generador calcula la potencia de 2 inferior mas cercana.

Con 12 equipos:

- Potencia inferior: 8.
- `preliminaryMatches = teamCount - lowerPowerOfTwo = 12 - 8 = 4`.
- `preliminaryTeams = preliminaryMatches * 2 = 8`.
- 8 equipos juegan preliminar.
- 4 equipos pasan directo a cuartos.

El sembrado de prueba usa sorteo aleatorio estable:

1. Ingenieria Mecanica Electrica
2. Ingenieria de Sistemas
3. Ingenieria Civil
4. Ingenieria de Minas
5. Arquitectura
6. Agronomia
7. Educacion Fisica
8. Derecho
9. Enfermeria
10. Contabilidad
11. Ingenieria Industrial
12. Medicina Humana

Resultado:

- P1: Contabilidad vs Medicina Humana
- P2: Agronomia vs Educacion Fisica
- P3: Ingenieria Mecanica Electrica vs Ingenieria de Sistemas
- P4: Derecho vs Ingenieria Civil
- C1: Ingenieria Industrial vs Ganador P4
- C2: Ingenieria de Minas vs Ganador P1
- C3: Arquitectura vs Ganador P3
- C4: Enfermeria vs Ganador P2
- S1: Ganador C1 vs Ganador C2
- S2: Ganador C3 vs Ganador C4
- F: Ganador S1 vs Ganador S2
- 3L: Perdedor S1 vs Perdedor S2

La seleccion de preliminares no esta hardcodeada al caso 10. Sale de `generateKnockoutBracket`, que soporta 2 a 16 equipos y queda preparado para mas.

## Horarios automaticos

Inputs de la seed:

- Fecha: 2026-07-18.
- Hora inicio: 09:00.
- Duracion: 20 minutos.
- Transicion: 10 minutos.
- Canchas: Cancha A y Cancha B.
- Descanso minimo recomendado: 40 minutos.
- Modo compacto preliminar: activado.

Fixture esperado:

- 09:00 | Cancha A | P1 | Contabilidad vs Medicina Humana
- 09:00 | Cancha B | P2 | Agronomia vs Educacion Fisica
- 09:30 | Cancha A | P3 | Ingenieria Mecanica Electrica vs Ingenieria de Sistemas
- 09:30 | Cancha B | P4 | Derecho vs Ingenieria Civil
- 10:00 | Cancha A | C1 | Ingenieria Industrial vs Ganador P4
- 10:00 | Cancha B | C2 | Ingenieria de Minas vs Ganador P1
- 10:30 | Cancha A | C3 | Arquitectura vs Ganador P3
- 10:30 | Cancha B | C4 | Enfermeria vs Ganador P2
- 11:00 | Cancha A | S1 | Ganador C1 vs Ganador C2
- 11:00 | Cancha B | S2 | Ganador C3 vs Ganador C4
- 11:30 | Cancha A | F | Ganador S1 vs Ganador S2
- 11:30 | Cancha B | 3L | Perdedor S1 vs Perdedor S2

`generateOneDaySchedule` ordena por ronda y respeta dependencias. En modo compacto permite esta maqueta visual y devuelve warning informativo si el descanso minimo real podria no cumplirse para equipos que avancen.

## Estados de fixture

- `draft_auto`: generado automaticamente mientras inscripciones siguen abiertas. Puede cambiar.
- `draft_review`: congelado al cerrar inscripciones. El admin revisa.
- `published`: oficial para publico y delegados. No se regenera automaticamente.
- `locked`: cerrado. No se modifica automaticamente.

Funciones de dominio:

- `shouldAutoRegenerateFixture(status)`
- `canRegenerateFixtureManually(status)`
- `canPublishFixture(status)`

## Reset y seed

Comandos:

```bash
npm run seed
npm run validate:fixture
```

Si no hay Supabase admin configurado, `npm run seed` no falla: informa modo mock y la app usa `src/lib/mock-data.ts`.

Para borrar y recrear datos deportivos en Supabase:

```bash
RESET_SERVER_DATA=true npm run seed
```

Requiere:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- migraciones aplicadas, especialmente `supabase/migrations/009_fixture_automation.sql`

Con Supabase real configurado, el seed valida primero que exista la migracion 009. Si faltan columnas de fixture (`fixture_status`, `label`, placeholders, dependencias), aborta antes de borrar datos. Esto evita dejar una base limpia pero sin fixture real.

El reset borra solo datos deportivos y conserva `auth.users`, `profiles` y `admin_emails`. Tambien compara la lista de correos admin antes y despues del seed.

## Validaciones

`npm run validate:fixture` comprueba:

- 1 campeonato.
- 12 equipos.
- minimo 96 jugadores.
- 4 preliminares.
- 4 cuartos.
- 2 semifinales.
- 1 final.
- 1 tercer lugar.
- 12 partidos totales.
- horarios esperados.
- sin dos partidos en la misma cancha a la misma hora.
- semifinales despues de cuartos.
- final despues de semifinales.
- `draft_auto` regenera; `published` y `locked` no.
- el modal publico no lee DNI.

## Pendientes y limitaciones

El mock ya funciona completo. Para persistir el fixture completo en Supabase con placeholders como `Ganador P1`, la base debe tener aplicada `009_fixture_automation.sql`, porque el esquema antiguo obligaba `home_team_id` y `away_team_id` no nulos. Sin esa migracion, el script ahora se detiene antes de borrar datos para no dejar el servidor en un estado parcial.
