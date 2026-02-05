-- Allow clinic members to delete intake forms (and cascaded answers)

drop policy if exists "Clinic members can delete intake forms" on intake_forms;
drop policy if exists "Clinic members can delete intake answers" on intake_answers;

create policy "Clinic members can delete intake forms"
  on intake_forms for delete
  using (exists (
    select 1 from patients p
    join clinic_memberships m on m.clinic_id = p.clinic_id
    where p.id = intake_forms.patient_id and m.user_id = auth.uid()
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
