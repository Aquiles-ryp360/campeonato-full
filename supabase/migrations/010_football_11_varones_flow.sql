-- Keep the public championship aligned with the Futbol 11 Varones draw flow.

UPDATE public.events
SET name = 'Campeonato Futbol 11 Varones',
    category = 'Varones',
    status = 'registration',
    rules_summary = 'Eliminacion directa para Futbol 11 Varones. Primero se muestran equipos inscritos y luego se sortean las llaves.'
WHERE id = '11111111-1111-4111-8111-111111111111'::uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'fixture_status'
  ) THEN
    UPDATE public.events
    SET fixture_status = 'draft_auto',
        seeding_mode = 'random'
    WHERE id = '11111111-1111-4111-8111-111111111111'::uuid;
  END IF;
END $$;
