-- Avoid recursion in clinic_memberships policies by using a SECURITY DEFINER helper.
create or replace function is_clinic_owner(p_clinic_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1
      from clinic_memberships m
     where m.clinic_id = p_clinic_id
       and m.user_id = auth.uid()
       and m.role = 'owner'
  );
end;
$$;

grant execute on function is_clinic_owner(uuid) to authenticated;

drop policy if exists "Clinic owners can read memberships" on clinic_memberships;
drop policy if exists "Clinic owners can update memberships" on clinic_memberships;
drop policy if exists "Clinic owners can delete memberships" on clinic_memberships;

create policy "Clinic owners can read memberships"
  on clinic_memberships for select
  using (is_clinic_owner(clinic_memberships.clinic_id));

create policy "Clinic owners can update memberships"
  on clinic_memberships for update
  using (is_clinic_owner(clinic_memberships.clinic_id))
  with check (is_clinic_owner(clinic_memberships.clinic_id));

create policy "Clinic owners can delete memberships"
  on clinic_memberships for delete
  using (is_clinic_owner(clinic_memberships.clinic_id));
