do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'registration_codes'
      and policyname = 'delegate_own_registration_code_select'
  ) then
    create policy "delegate_own_registration_code_select"
      on public.registration_codes for select
      using (
        exists (
          select 1
          from public.teams
          where teams.registration_code_id = registration_codes.id
            and teams.delegate_user_id = auth.uid()
        )
      );
  end if;
end $$;
