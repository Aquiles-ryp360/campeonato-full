# Changelog

## Unreleased

### Added

- Publicacion inmediata de resultados cargados por arbitro con estado `referee_submitted`.
- Visualizacion publica de resultado oficial, resultado en revision y resultado corregido.
- Avance inmediato de ganador en llaves al enviar resultado oficial por arbitro.
- Declaracion inmediata de campeon cuando la final queda definida por el arbitro.
- Flujo de penales con marcador separado, ganador por penales y barra visual verde/roja.
- Acciones admin para marcar un resultado `under_review` y publicar correcciones de marcador/ganador.
- Migracion `supabase/migrations/012_penalty_resolution_metadata.sql` para estados nuevos, `win_method` y campeon del evento.

### Changed

- El admin ya no aprueba resultados antes de que sean visibles publicamente.
- `submitted` queda como compatibilidad visual de resultado oficial; el nuevo flujo escribe `referee_submitted`.
- La vista publica, delegado, arbitro y admin muestran el resultado cargado por arbitro sin requerir login ni revision previa.

### Pending

- Aplicar `supabase/migrations/012_penalty_resolution_metadata.sql` en Supabase.
- Implementar UI admin granular para corregir goleadores, tarjetas, penales, eventos anulados y auditoria visible de correcciones.
