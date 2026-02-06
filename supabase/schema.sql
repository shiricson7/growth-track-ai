-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 0. Clinics & Memberships
create table if not exists clinics (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  clinic_code text unique default substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8),
  doctor_name text,
  address text,
  phone text
);

alter table clinics add column if not exists doctor_name text;
alter table clinics add column if not exists address text;
alter table clinics add column if not exists phone text;

create table if not exists clinic_memberships (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clinic_id uuid references clinics(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'staff', 'tablet')) not null default 'staff',
  unique (clinic_id, user_id),
  unique (user_id)
);

-- 1. Patients Table
create table if not exists patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  birth_date date not null,
  gender text check (gender in ('male', 'female')) not null,
  registration_number text, 
  contact_number text,
  guardian_name text,
  height_father numeric,
  height_mother numeric,
  chart_number text,
  tanner_stage text,
  clinic_id uuid references clinics(id)
);

-- Safely add new columns if they don't exist
alter table patients add column if not exists bone_age numeric;
alter table patients add column if not exists clinic_id uuid references clinics(id);
alter table patients add column if not exists chart_number text;
alter table patients add column if not exists tanner_stage text;


-- 2. Medications Table
create table if not exists medications (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  type text check (type in ('GH', 'GnRH')) not null,
  name text not null,
  dosage text not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  status text check (status in ('active', 'completed', 'paused')) default 'active'
);

-- 3. Measurements Table
create table if not exists measurements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  date date not null,
  height numeric, 
  weight numeric,
  bone_age numeric, 
  measured_by text
);

-- 4. Lab Results Table
create table if not exists lab_results (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  date date not null,
  test_type text not null, 
  value numeric not null,
  unit text,
  reference_range_low numeric,
  reference_range_high numeric,
  notes text,
  file_path text 
);

-- 5. AI Reports Table
create table if not exists ai_reports (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  kind text check (kind in ('dashboard', 'parent_report')) not null,
  analysis jsonb,
  predicted_height numeric,
  markdown_report text,
  source_model text,
  unique (patient_id, kind)
);


-- 5. Security (RLS) & Policies
-- Using DO blocks to safely create policies only if they don't exist

-- Clinics
alter table clinics enable row level security;
drop policy if exists "Enable all access for all users" on clinics;
drop policy if exists "Clinic members can read clinics" on clinics;
drop policy if exists "Authenticated can create clinics" on clinics;
drop policy if exists "Clinic owners can update clinics" on clinics;

create policy "Clinic members can read clinics"
  on clinics for select
  using (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinics.id and m.user_id = auth.uid()
  ));

create policy "Authenticated can create clinics"
  on clinics for insert
  with check (auth.uid() is not null);

create policy "Clinic owners can update clinics"
  on clinics for update
  using (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinics.id and m.user_id = auth.uid() and m.role = 'owner'
  ))
  with check (exists (
    select 1 from clinic_memberships m
    where m.clinic_id = clinics.id and m.user_id = auth.uid() and m.role = 'owner'
  ));

-- Clinic Memberships
alter table clinic_memberships enable row level security;
drop policy if exists "Enable all access for all users" on clinic_memberships;
drop policy if exists "Users can read own membership" on clinic_memberships;
drop policy if exists "Users can insert own membership" on clinic_memberships;
drop policy if exists "Clinic owners can read memberships" on clinic_memberships;
drop policy if exists "Clinic owners can update memberships" on clinic_memberships;
drop policy if exists "Clinic owners can delete memberships" on clinic_memberships;

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

create policy "Users can read own membership"
  on clinic_memberships for select
  using (user_id = auth.uid());

create policy "Users can insert own membership"
  on clinic_memberships for insert
  with check (user_id = auth.uid());

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

-- Patients
alter table patients enable row level security;
drop policy if exists "Enable all access for all users" on patients;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'Clinic members can read patients') then
    create policy "Clinic members can read patients" on patients
      for select using (exists (
        select 1 from clinic_memberships m
        where m.clinic_id = patients.clinic_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'Clinic members can insert patients') then
    create policy "Clinic members can insert patients" on patients
      for insert with check (exists (
        select 1 from clinic_memberships m
        where m.clinic_id = patients.clinic_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'Clinic members can update patients') then
    create policy "Clinic members can update patients" on patients
      for update using (exists (
        select 1 from clinic_memberships m
        where m.clinic_id = patients.clinic_id and m.user_id = auth.uid()
      )) with check (exists (
        select 1 from clinic_memberships m
        where m.clinic_id = patients.clinic_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'Clinic members can delete patients') then
    create policy "Clinic members can delete patients" on patients
      for delete using (exists (
        select 1 from clinic_memberships m
        where m.clinic_id = patients.clinic_id and m.user_id = auth.uid()
      ));
  end if;
end $$;

-- Medications
alter table medications enable row level security;
drop policy if exists "Enable all access for all users" on medications;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'medications' and policyname = 'Clinic members can read medications') then
    create policy "Clinic members can read medications" on medications
      for select using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = medications.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'medications' and policyname = 'Clinic members can insert medications') then
    create policy "Clinic members can insert medications" on medications
      for insert with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = medications.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'medications' and policyname = 'Clinic members can update medications') then
    create policy "Clinic members can update medications" on medications
      for update using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = medications.patient_id and m.user_id = auth.uid()
      )) with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = medications.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'medications' and policyname = 'Clinic members can delete medications') then
    create policy "Clinic members can delete medications" on medications
      for delete using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = medications.patient_id and m.user_id = auth.uid()
      ));
  end if;
end $$;

-- Measurements
alter table measurements enable row level security;
drop policy if exists "Enable all access for all users" on measurements;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'measurements' and policyname = 'Clinic members can read measurements') then
    create policy "Clinic members can read measurements" on measurements
      for select using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = measurements.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'measurements' and policyname = 'Clinic members can insert measurements') then
    create policy "Clinic members can insert measurements" on measurements
      for insert with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = measurements.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'measurements' and policyname = 'Clinic members can update measurements') then
    create policy "Clinic members can update measurements" on measurements
      for update using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = measurements.patient_id and m.user_id = auth.uid()
      )) with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = measurements.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'measurements' and policyname = 'Clinic members can delete measurements') then
    create policy "Clinic members can delete measurements" on measurements
      for delete using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = measurements.patient_id and m.user_id = auth.uid()
      ));
  end if;
end $$;

-- Lab Results
alter table lab_results enable row level security;
drop policy if exists "Enable all access for all users" on lab_results;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'lab_results' and policyname = 'Clinic members can read lab results') then
    create policy "Clinic members can read lab results" on lab_results
      for select using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = lab_results.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lab_results' and policyname = 'Clinic members can insert lab results') then
    create policy "Clinic members can insert lab results" on lab_results
      for insert with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = lab_results.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lab_results' and policyname = 'Clinic members can update lab results') then
    create policy "Clinic members can update lab results" on lab_results
      for update using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = lab_results.patient_id and m.user_id = auth.uid()
      )) with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = lab_results.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'lab_results' and policyname = 'Clinic members can delete lab results') then
    create policy "Clinic members can delete lab results" on lab_results
      for delete using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = lab_results.patient_id and m.user_id = auth.uid()
      ));
  end if;
end $$;

-- AI Reports
alter table ai_reports enable row level security;
drop policy if exists "Enable all access for all users" on ai_reports;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ai_reports' and policyname = 'Clinic members can read ai reports') then
    create policy "Clinic members can read ai reports" on ai_reports
      for select using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = ai_reports.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ai_reports' and policyname = 'Clinic members can insert ai reports') then
    create policy "Clinic members can insert ai reports" on ai_reports
      for insert with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = ai_reports.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ai_reports' and policyname = 'Clinic members can update ai reports') then
    create policy "Clinic members can update ai reports" on ai_reports
      for update using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = ai_reports.patient_id and m.user_id = auth.uid()
      )) with check (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = ai_reports.patient_id and m.user_id = auth.uid()
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ai_reports' and policyname = 'Clinic members can delete ai reports') then
    create policy "Clinic members can delete ai reports" on ai_reports
      for delete using (exists (
        select 1 from patients p
        join clinic_memberships m on m.clinic_id = p.clinic_id
        where p.id = ai_reports.patient_id and m.user_id = auth.uid()
      ));
  end if;
end $$;

-- Join clinic by code RPC (optional convenience)
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

-- Create clinic RPC (ensures membership + avoids RLS insert issues)
create or replace function create_clinic(p_name text)
returns clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic clinics;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into clinics (name)
  values (p_name)
  returning * into v_clinic;

  insert into clinic_memberships (clinic_id, user_id, role)
  values (v_clinic.id, auth.uid(), 'owner')
  on conflict (user_id) do update set clinic_id = excluded.clinic_id, role = 'owner';

  return v_clinic;
end;
$$;

grant execute on function create_clinic(text) to authenticated;

-- Fetch current user's clinic with elevated privileges (bypasses RLS)
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

-- 6. Intake (Pre-visit Questionnaire)
create table if not exists intake_tokens (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  token text unique not null,
  patient_id uuid references patients(id) on delete cascade not null,
  expires_at timestamp with time zone not null default (timezone('utc'::text, now()) + interval '72 hours'),
  status text check (status in ('active', 'used', 'expired')) not null default 'active',
  used_at timestamp with time zone
);

create table if not exists intake_forms (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  token text references intake_tokens(token),
  status text check (status in ('submitted', 'reviewed')) not null default 'submitted',
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists intake_answers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  form_id uuid references intake_forms(id) on delete cascade not null,
  version text not null default 'v1',
  answers_json jsonb not null,
  flags_json jsonb,
  summary_json jsonb
);

create unique index if not exists intake_answers_form_id_key on intake_answers(form_id);
create index if not exists intake_tokens_patient_id_idx on intake_tokens(patient_id);
create index if not exists intake_tokens_status_idx on intake_tokens(status);
create index if not exists intake_forms_patient_id_idx on intake_forms(patient_id);
create index if not exists intake_forms_submitted_at_idx on intake_forms(submitted_at desc);

alter table intake_tokens enable row level security;
alter table intake_forms enable row level security;
alter table intake_answers enable row level security;

drop policy if exists "Clinic members can read intake tokens" on intake_tokens;
drop policy if exists "Clinic members can insert intake tokens" on intake_tokens;
drop policy if exists "Clinic members can read intake forms" on intake_forms;
drop policy if exists "Clinic members can delete intake forms" on intake_forms;
drop policy if exists "Clinic members can read intake answers" on intake_answers;
drop policy if exists "Clinic members can delete intake answers" on intake_answers;

create policy "Clinic members can read intake tokens"
  on intake_tokens for select
  using (exists (
    select 1 from patients p
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where p.id = intake_tokens.patient_id and m.user_id = auth.uid()
  ));

create policy "Clinic members can insert intake tokens"
  on intake_tokens for insert
  with check (exists (
    select 1 from patients p
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where p.id = intake_tokens.patient_id and m.user_id = auth.uid()
  ));

create policy "Clinic members can read intake forms"
  on intake_forms for select
  using (exists (
    select 1 from patients p
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where p.id = intake_forms.patient_id and m.user_id = auth.uid()
  ));

create policy "Clinic members can delete intake forms"
  on intake_forms for delete
  using (exists (
    select 1 from patients p
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where p.id = intake_forms.patient_id and m.user_id = auth.uid()
  ));

create policy "Clinic members can read intake answers"
  on intake_answers for select
  using (exists (
    select 1
    from intake_forms f
    join patients p on p.id = f.patient_id
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where f.id = intake_answers.form_id and m.user_id = auth.uid()
  ));

create policy "Clinic members can delete intake answers"
  on intake_answers for delete
  using (exists (
    select 1
    from intake_forms f
    join patients p on p.id = f.patient_id
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where f.id = intake_answers.form_id and m.user_id = auth.uid()
  ));
