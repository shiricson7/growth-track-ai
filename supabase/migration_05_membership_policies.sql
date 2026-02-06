-- Allow clinic owners to view and manage memberships in their clinic
drop policy if exists "Users can read own membership" on clinic_memberships;
drop policy if exists "Users can insert own membership" on clinic_memberships;
drop policy if exists "Clinic owners can read memberships" on clinic_memberships;
drop policy if exists "Clinic owners can update memberships" on clinic_memberships;
drop policy if exists "Clinic owners can delete memberships" on clinic_memberships;

create policy "Users can read own membership"
  on clinic_memberships for select
  using (user_id = auth.uid());

create policy "Users can insert own membership"
  on clinic_memberships for insert
  with check (user_id = auth.uid());

create policy "Clinic owners can read memberships"
  on clinic_memberships for select
  using (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinic_memberships.clinic_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

create policy "Clinic owners can update memberships"
  on clinic_memberships for update
  using (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinic_memberships.clinic_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ))
  with check (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinic_memberships.clinic_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));

create policy "Clinic owners can delete memberships"
  on clinic_memberships for delete
  using (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinic_memberships.clinic_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ));
