-- Return clinic members with emails for owners
create or replace function get_clinic_members_with_emails(p_clinic_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not is_clinic_owner(p_clinic_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select m.id,
         m.user_id,
         m.role,
         m.created_at,
         u.email
    from clinic_memberships m
    left join auth.users u on u.id = m.user_id
   where m.clinic_id = p_clinic_id
   order by m.created_at asc;
end;
$$;

grant execute on function get_clinic_members_with_emails(uuid) to authenticated;
