import { supabaseAdmin } from '../../../src/lib/supabaseAdmin';
import IntakeForm from './IntakeForm';
import { isTokenExpired } from '../../../src/lib/intake/token';

export const dynamic = 'force-dynamic';

interface IntakePageProps {
  params: { token: string };
}

export default async function IntakePage({ params }: IntakePageProps) {
  const token = params.token;
  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .select('token, expires_at, status, patient:patients(name, birth_date, gender, height_father, height_mother)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">문진 링크를 확인할 수 없습니다</h1>
          <p className="text-slate-500 mt-2">링크가 유효하지 않거나 만료되었습니다.</p>
        </div>
      </div>
    );
  }

  if (data.status !== 'active' || isTokenExpired(data.expires_at)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">문진 링크가 만료되었습니다</h1>
          <p className="text-slate-500 mt-2">병원에 새 문진 링크를 요청해 주세요.</p>
        </div>
      </div>
    );
  }

  const patient = Array.isArray(data.patient) ? data.patient[0] : data.patient;
  const prefill = patient
    ? {
        child_name: patient.name ?? '',
        birth_date: patient.birth_date ?? '',
        sex: patient.gender === 'female' ? '여' : patient.gender === 'male' ? '남' : '',
        father_cm: patient.height_father ?? '',
        mother_cm: patient.height_mother ?? '',
      }
    : undefined;

  return <IntakeForm token={token} expiresAt={data.expires_at} prefill={prefill} />;
}
