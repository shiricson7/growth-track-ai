-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Patients Table
create table if not exists patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  birth_date date not null,
  gender text check (gender in ('male', 'female')) not null,
  registration_number text, -- Resident Registration Number (masked or partial if needed)
  contact_number text,
  guardian_name text,
  height_father numeric,
  height_mother numeric
);

-- Growth Measurements Table
create table if not exists measurements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  date date not null,
  height numeric not null,
  weight numeric not null,
  bone_age numeric, -- Bone age in years
  measured_by text
);

-- Lab Results Table
create table if not exists lab_results (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade not null,
  date date not null,
  test_type text not null, -- e.g., 'IGF-1', 'TSH', 'T4', 'LH', 'FSH'
  value numeric not null,
  unit text,
  reference_range_low numeric,
  reference_range_high numeric,
  notes text,
  file_path text -- Path to original PDF/image in storage if needed
);

-- Policies (RLS) - Basic setup for now, allowing full access. 
-- IN PRODUCTION: You must restrict this!
alter table patients enable row level security;
alter table measurements enable row level security;
alter table lab_results enable row level security;

create policy "Enable all access for all users" on patients
for all using (true) with check (true);

create policy "Enable all access for all users" on measurements
for all using (true) with check (true);

create policy "Enable all access for all users" on lab_results
for all using (true) with check (true);
