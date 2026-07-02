alter table public.events
  add column if not exists organizer_name text,
  add column if not exists career_name text,
  add column if not exists career_logo_url text,
  add column if not exists payment_qr_yape_url text,
  add column if not exists payment_qr_plin_url text,
  add column if not exists payment_contact_phone text,
  add column if not exists payment_contact_whatsapp_url text,
  add column if not exists theme_primary_color text not null default '#2f6f4e',
  add column if not exists theme_secondary_color text not null default '#b7e06c';

update public.events
set organizer_name = coalesce(organizer_name, 'Comision deportiva de Ingenieria Mecanica Electrica'),
    career_name = coalesce(career_name, 'Ingenieria Mecanica Electrica'),
    career_logo_url = coalesce(career_logo_url, '/epime-09/logo-carrera.png'),
    payment_qr_yape_url = coalesce(payment_qr_yape_url, '/epime-09/qr-yape.png'),
    payment_contact_phone = coalesce(payment_contact_phone, '+51923037653'),
    payment_contact_whatsapp_url = coalesce(payment_contact_whatsapp_url, 'https://wa.me/51923037356?text=Te%20env%C3%ADo%20la%20captura.%20Por%20favor%2C%20proporci%C3%B3name%20el%20c%C3%B3digo%20%C3%BAnico%20de%20acceso.'),
    theme_primary_color = coalesce(theme_primary_color, '#28398f'),
    theme_secondary_color = coalesce(theme_secondary_color, '#f4e84a')
where lower(name) like '%ingenieria mecanica electrica%'
   or slug in ('campeonato-futbol-11-2026', 'voley-2026', 'futsal-2026');
