import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/supabaseAdmin';
import { computeIntakeFlags } from '../../../../../src/lib/intake/flags';
import { buildSummary } from '../../../../../src/lib/intake/summary';
import { INTAKE_SCHEMA_VERSION, IntakeAnswers } from '../../../../../src/lib/intake/schema';
import { isTokenExpired } from '../../../../../src/lib/intake/token';

interface Params {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const answers = (payload as any).answers as IntakeAnswers;
  const version = (payload as any).version || INTAKE_SCHEMA_VERSION;

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
  }

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('intake_tokens')
    .select('token, patient_id, expires_at, status')
    .eq('token', token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  if (tokenRow.status !== 'active') {
    return NextResponse.json({ error: 'Token already used' }, { status: 409 });
  }

  if (isTokenExpired(tokenRow.expires_at)) {
    await supabaseAdmin
      .from('intake_tokens')
      .update({ status: 'expired' })
      .eq('token', token);
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id, gender')
    .eq('id', tokenRow.patient_id)
    .single();

  if (patientError || !patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const sex = patient.gender === 'female' ? 'female' : 'male';
  const flags = computeIntakeFlags(answers, sex);
  const summary = buildSummary(answers);

  const { data: form, error: formError } = await supabaseAdmin
    .from('intake_forms')
    .insert({
      patient_id: tokenRow.patient_id,
      token: tokenRow.token,
      status: 'submitted',
    })
    .select()
    .single();

  if (formError || !form) {
    return NextResponse.json({ error: 'Failed to save form' }, { status: 500 });
  }

  const { error: answerError } = await supabaseAdmin.from('intake_answers').insert({
    form_id: form.id,
    version,
    answers_json: answers,
    flags_json: flags,
    summary_json: summary,
  });

  if (answerError) {
    return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
  }

  await supabaseAdmin
    .from('intake_tokens')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('token', token);

  return NextResponse.json({ ok: true, formId: form.id });
}
