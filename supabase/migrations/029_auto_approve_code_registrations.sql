-- Inscribirse con el codigo unico (entregado tras el pago) ya valida la inscripcion.
-- Aprueba los equipos que se inscribieron con codigo y quedaron pendientes de revision.
update public.teams
set status = 'approved',
    payment_validated_at = coalesce(payment_validated_at, created_at),
    approved_at = coalesce(approved_at, now()),
    updated_at = now()
where registration_code_id is not null
  and status = 'registered';
