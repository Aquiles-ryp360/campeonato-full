# Changelog

## Unreleased

### Added

- Publicacion inmediata de resultados cargados por arbitro con estado `referee_submitted`.
- Visualizacion publica de resultado oficial, resultado en revision y resultado corregido.
- Avance inmediato de ganador en llaves al enviar resultado oficial por arbitro.
- Declaracion inmediata de campeon cuando la final queda definida por el arbitro.
- Flujo de penales con marcador separado, ganador por penales y barra visual verde/roja.
- Acciones admin para marcar un resultado `under_review` y publicar correcciones de marcador/ganador.
- Middleware de autenticacion para `/admin`, `/delegado` y `/arbitro` con validacion server-side de roles.
- APIs `GET /api/teams`, `GET /api/matches`, `GET /api/referee/matches` y `GET /api/admin/results/pending`.
- UI admin granular en `/admin/resultados` para anular/restaurar goles, tarjetas, penales y observaciones con auditoria.
- Componentes reutilizables `EmptyState`, `LoadingSkeleton`, `ErrorState`, `ConfirmDialog`, `Breadcrumbs`, `Tabs` y `DataTable`.
- Archivos globales App Router: `not-found.tsx`, `error.tsx`, `loading.tsx`, `sitemap.ts`, `robots.ts`, `icon.tsx` y `opengraph-image.tsx`.
- GitHub Actions CI, `.nvmrc`, `.editorconfig`, `.prettierrc` y headers de seguridad basicos en `next.config.mjs`.
- Migracion `supabase/migrations/012_penalty_resolution_metadata.sql` para estados nuevos, `win_method` y campeon del evento.
- Migracion `supabase/migrations/013_registration_production_hardening.sql` para revision de equipos, pago validado, storage `enrollment-files` y control de cambio de camiseta.
- Validaciones productivas de inscripcion: estado `registration`, fecha de cierre, cupo maximo, ficha obligatoria, semestre obligatorio y duplicados por DNI/codigo dentro y fuera del equipo.
- APIs de delegado para guardar datos del equipo, agregar jugadores con ficha real y cambiar camiseta una sola vez luego del inicio.
- Acciones admin reales para validar pago, aprobar, observar y rechazar equipos.
- Semilla `src/lib/futbol-18-seed.ts` para el campeonato "Futbol Relampago 2026": 18 equipos en 5 grupos (4, 4, 4, 3 y 3), 24 partidos de grupos y llave final de 10 equipos (2 preliminares, 4 cuartos, 2 semifinales, tercer lugar y final) para 34 partidos en 2 canchas.
- Scripts `npm run seed:futbol-18` y `npm run validate:futbol-18` con prueba `scripts/futbol-18.test.ts`.
- Migracion `supabase/migrations/023_group_qualification.sql` que agrega `events.qualify_best_thirds`.
- Pagina imprimible del fixture `/imprimir/[championshipSlug]` con enlace "Version imprimible" desde el fixture publico. Lista cruces por grupo y fase sin mostrar la hora de cada partido.

### Changed

- El admin ya no aprueba resultados antes de que sean visibles publicamente.
- `submitted` queda como compatibilidad visual de resultado oficial; el nuevo flujo escribe `referee_submitted`.
- La vista publica, delegado, arbitro y admin muestran el resultado cargado por arbitro sin requerir login ni revision previa.
- Las fichas de matricula ya no se guardan como nombre de archivo local; se suben a Supabase Storage y se guarda su ruta.
- El pago queda pendiente hasta validacion admin, aunque el codigo de inscripcion haya sido usado.
- La autorizacion de paneles privados ya no depende solo del gate cliente/localStorage cuando Supabase esta configurado.
- La clasificacion por grupos ya no fuerza "mejores terceros" cuando no alcanzan a completar la siguiente potencia de dos; los clasificados directos arman la llave con ronda preliminar (por ejemplo, 5 grupos con clasificacion de dos por grupo = 10 equipos).

### Pending

- Aplicar `supabase/migrations/012_penalty_resolution_metadata.sql` en Supabase.
- Aplicar `supabase/migrations/023_group_qualification.sql` en Supabase.
- Aplicar `supabase/migrations/013_registration_production_hardening.sql` en Supabase.
- Aplicar `supabase/migrations/010_referee_live_module.sql` y `011_penalty_live_flow.sql` si el entorno remoto aun no las tiene.
- Implementar UI admin granular para corregir fichas, semestres o datos historicos de jugadores despues de aprobado el equipo.
