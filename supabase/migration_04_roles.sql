-- Expand clinic membership roles to owner/staff/tablet
update clinic_memberships
set role = 'staff'
where role = 'member';

alter table clinic_memberships
  drop constraint if exists clinic_memberships_role_check;

alter table clinic_memberships
  add constraint clinic_memberships_role_check check (role in ('owner', 'staff', 'tablet'));

alter table clinic_memberships
  alter column role set default 'staff';

-- Ensure join_clinic_by_code assigns staff role by default
create or replace function join_clinic_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select id into v_clinic_id from clinics where clinic_code = p_code;
  if v_clinic_id is null then
    raise exception 'Invalid clinic code';
  end if;

  insert into clinic_memberships (clinic_id, user_id, role)
  values (v_clinic_id, auth.uid(), 'staff')
  on conflict (user_id) do update set clinic_id = excluded.clinic_id;

  return v_clinic_id;
end;
$$;

grant execute on function join_clinic_by_code(text) to authenticated;
