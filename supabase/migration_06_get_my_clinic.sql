-- Security definer RPC to fetch current user's clinic (bypasses RLS)
create or replace function get_my_clinic()
returns table (
  clinic_id uuid,
  role text,
  id uuid,
  name text,
  clinic_code text,
  doctor_name text,
  address text,
  phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select m.clinic_id,
         m.role,
         c.id,
         c.name,
         c.clinic_code,
         c.doctor_name,
         c.address,
         c.phone
    from clinic_memberships m
    join clinics c on c.id = m.clinic_id
   where m.user_id = auth.uid()
   order by m.created_at desc
   limit 1;
end;
$$;

grant execute on function get_my_clinic() to authenticated;
