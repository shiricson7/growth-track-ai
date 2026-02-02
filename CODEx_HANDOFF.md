# Codex Handoff (growth-track-ai)

Date: 2026-02-02

## What was changed
- Added team/clinic RLS model in Supabase:
  - New tables: `clinics`, `clinic_memberships`
  - New patient column: `patients.clinic_id`
  - RLS policies now restrict by clinic membership
  - Added RPC: `join_clinic_by_code(code)` (auth required)
  - File: `supabase/schema.sql`
- Added Auth flow and clinic onboarding UI:
  - `components/Auth.tsx` (email/password sign in/up)
  - `components/ClinicOnboarding.tsx` (create/join clinic)
  - `App.tsx` now gates app on auth + clinic
- Added clinic context APIs:
  - `src/services/api.ts`: `getMyClinic`, `createClinic`, `joinClinicByCode`
  - `getPatients` now requires `clinicId`
  - `createPatient` now requires `clinicId`
- Types updated:
  - `types.ts`: `ClinicInfo`, `Patient.clinicId`
- Security: moved secrets out of repo
  - `import.env` removed
  - `.env.local` created
  - `.env.example` created
  - `.gitignore` updated
  - `README.md` updated
- Added `.editorconfig` for UTF-8

## Important reminders
- Run `supabase/schema.sql` in Supabase SQL Editor.
- Enable Email/Password auth in Supabase.
- Existing data must have `patients.clinic_id` set or it will be blocked by RLS.

## Pending tests (manual)
1) `npm run dev`
2) Sign up -> confirm email if required -> login
3) Create clinic -> note clinic code
4) Login with another account -> join clinic by code
5) Verify patients are shared within clinic only

## Files touched
- `supabase/schema.sql`
- `App.tsx`
- `src/services/api.ts`
- `types.ts`
- `components/Auth.tsx`
- `components/ClinicOnboarding.tsx`
- `.gitignore`
- `README.md`
- `.env.local`
- `.env.example`
- `.editorconfig`

