update public.teams
set delegate_email = lower(trim(delegate_email))
where delegate_email is not null
  and delegate_email <> lower(trim(delegate_email));

create index if not exists teams_delegate_email_idx
  on public.teams (delegate_email)
  where delegate_email is not null;

create index if not exists teams_delegate_user_id_idx
  on public.teams (delegate_user_id)
  where delegate_user_id is not null;
