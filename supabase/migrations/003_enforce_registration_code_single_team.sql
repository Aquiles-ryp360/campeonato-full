create unique index if not exists teams_registration_code_unique_idx
  on public.teams (registration_code_id)
  where registration_code_id is not null;
