-- Backfill legacy patients with missing clinic_id to the current owner's clinic
create or replace function backfill_patients_to_my_clinic()
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_clinic_id uuid;
  v_role text;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select clinic_id, role
    into v_clinic_id, v_role
    from clinic_memberships
   where user_id = auth.uid()
   order by created_at desc
   limit 1;

  if v_clinic_id is null then
    raise exception 'No clinic membership found';
  end if;

  if v_role <> 'owner' then
    raise exception 'Only clinic owners can backfill patients';
  end if;

  update patients
     set clinic_id = v_clinic_id
   where clinic_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function backfill_patients_to_my_clinic() to authenticated;
