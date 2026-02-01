-- Enable UUID extension
create extension if not exists "uuid-ossp";

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
  height_mother numeric
);

-- Safely add new columns if they don't exist
alter table patients add column if not exists bone_age numeric;


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


-- 5. Security (RLS) & Policies
-- Using DO blocks to safely create policies only if they don't exist

-- Patients
alter table patients enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'patients' and policyname = 'Enable all access for all users') then
    create policy "Enable all access for all users" on patients for all using (true) with check (true);
  end if;
end $$;

-- Medications
alter table medications enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'medications' and policyname = 'Enable all access for all users') then
    create policy "Enable all access for all users" on medications for all using (true) with check (true);
  end if;
end $$;

-- Measurements
alter table measurements enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'measurements' and policyname = 'Enable all access for all users') then
    create policy "Enable all access for all users" on measurements for all using (true) with check (true);
  end if;
end $$;

-- Lab Results
alter table lab_results enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'lab_results' and policyname = 'Enable all access for all users') then
    create policy "Enable all access for all users" on lab_results for all using (true) with check (true);
  end if;
end $$;
