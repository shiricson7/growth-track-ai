-- Intake tokens & forms for pre-visit questionnaire

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

-- RLS policies
alter table intake_tokens enable row level security;
alter table intake_forms enable row level security;
alter table intake_answers enable row level security;

drop policy if exists "Clinic members can read intake tokens" on intake_tokens;
drop policy if exists "Clinic members can insert intake tokens" on intake_tokens;

drop policy if exists "Clinic members can read intake forms" on intake_forms;

drop policy if exists "Clinic members can read intake answers" on intake_answers;

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

create policy "Clinic members can read intake answers"
  on intake_answers for select
  using (exists (
    select 1
    from intake_forms f
    join patients p on p.id = f.patient_id
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where f.id = intake_answers.form_id and m.user_id = auth.uid()
  ));
