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
- Migracion `supabase/migrations/013_registration_production_hardening.sql` para revision de equipos, pago validado, storage `enrollment-files` y control de cambio de camiseta.
- Validaciones productivas de inscripcion: estado `registration`, fecha de cierre, cupo maximo, ficha obligatoria, semestre obligatorio y duplicados por DNI/codigo dentro y fuera del equipo.
- APIs de delegado para guardar datos del equipo, agregar jugadores con ficha real y cambiar camiseta una sola vez luego del inicio.
- Acciones admin reales para validar pago, aprobar, observar y rechazar equipos.

### Changed

- El admin ya no aprueba resultados antes de que sean visibles publicamente.
- `submitted` queda como compatibilidad visual de resultado oficial; el nuevo flujo escribe `referee_submitted`.
- La vista publica, delegado, arbitro y admin muestran el resultado cargado por arbitro sin requerir login ni revision previa.
- Las fichas de matricula ya no se guardan como nombre de archivo local; se suben a Supabase Storage y se guarda su ruta.
- El pago queda pendiente hasta validacion admin, aunque el codigo de inscripcion haya sido usado.

### Pending

- Aplicar `supabase/migrations/012_penalty_resolution_metadata.sql` en Supabase.
- Aplicar `supabase/migrations/013_registration_production_hardening.sql` en Supabase.
- Implementar UI admin granular para corregir goleadores, tarjetas, penales, eventos anulados y auditoria visible de correcciones.
- Implementar UI admin granular para corregir fichas, semestres o datos historicos de jugadores despues de aprobado el equipo.
