update public.events
set payment_contact_phone = '+51984000201',
    payment_contact_whatsapp_url = 'https://wa.me/51984000201?text=Hola%2C%20solicito%20mi%20c%C3%B3digo%20%C3%BAnico%20de%20inscripci%C3%B3n.%20Adjunto%20la%20captura%20del%20Yape%20para%20validar%20el%20pago.',
    schedule_config = jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(schedule_config, '{}'::jsonb),
          '{branding}',
          coalesce(schedule_config->'branding', '{}'::jsonb),
          true
        ),
        '{branding,paymentContactPhone}',
        to_jsonb('+51984000201'::text),
        true
      ),
      '{branding,paymentContactWhatsappUrl}',
      to_jsonb('https://wa.me/51984000201?text=Hola%2C%20solicito%20mi%20c%C3%B3digo%20%C3%BAnico%20de%20inscripci%C3%B3n.%20Adjunto%20la%20captura%20del%20Yape%20para%20validar%20el%20pago.'::text),
      true
    )
where lower(name) like '%ingenieria mecanica electrica%'
   or slug in ('campeonato-futbol-11-2026', 'voley-2026', 'futsal-2026');
