-- Compatibility alias: the application stores championships in public.events.
-- This view lets reviewers and SQL tools query public.championships without duplicating data.

create or replace view public.championships
with (security_invoker = true)
as
select *
from public.events;

grant select on public.championships to anon, authenticated;
