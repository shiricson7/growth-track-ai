'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../src/lib/supabase';
import { intakeSchemaV1 } from '../../../../src/lib/intake/schema';

interface IntakeDetail {
  id: string;
  submitted_at: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    gender: string;
    chart_number?: string | null;
  } | null;
  answers?: {
    answers_json?: Record<string, any> | null;
    flags_json?: Record<string, boolean> | null;
    summary_json?: string[] | null;
    version?: string | null;
  } | null;
}

const valueLabels: Record<string, string> = {
  low: '적음',
  normal: '보통',
  high: '많음',
};

const formatValue = (value: any) => {
  if (value === true) return '예';
  if (value === false) return '아니오';
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && valueLabels[value]) return valueLabels[value];
  return String(value);
};

export default function IntakeDetailPage() {
  const params = useParams();
  const formId = params.formId as string;
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setDetail(null);
          setError('로그인이 필요합니다.');
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('intake_forms')
          .select(
            'id, submitted_at, status, patient:patients(id, name, gender, chart_number), answers:intake_answers(answers_json, flags_json, summary_json, version)'
          )
          .eq('id', formId)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) {
          setError('문진 정보를 찾을 수 없습니다.');
          setDetail(null);
          setLoading(false);
          return;
        }

        setDetail({
          ...data,
          patient: Array.isArray((data as any).patient) ? (data as any).patient[0] : (data as any).patient,
          answers: Array.isArray((data as any).answers) ? (data as any).answers[0] : (data as any).answers,
        } as IntakeDetail);
      } catch (err: any) {
        setError(err?.message || '문진 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (formId) load();
  }, [formId]);

  const sections = intakeSchemaV1;
  const answers = detail?.answers?.answers_json || {};
  const summary = detail?.answers?.summary_json || [];
  const flags = detail?.answers?.flags_json || {};

  const hasRisk = useMemo(() => Object.values(flags).some(Boolean), [flags]);
  const hasSummary = summary.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-center text-slate-500">로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-center text-red-600">{error}</div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-center text-slate-500">문진 정보가 없습니다.</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">문진 상세</h1>
            <p className="text-sm text-slate-500 mt-1">제출일: {new Date(detail.submitted_at).toLocaleString('ko-KR')}</p>
          </div>
          <Link
            href="/intakes"
            className="text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            목록으로
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">환자</p>
              <p className="text-lg font-bold text-slate-900">{detail.patient?.name}</p>
              <p className="text-xs text-slate-400">차트번호: {detail.patient?.chart_number || '-'}</p>
            </div>
            {detail.patient?.id && (
              <Link
                href={`/?patientId=${detail.patient.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                성장차트 보기
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">요약</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {hasRisk && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  위험 플래그
                </span>
              )}
              {hasSummary &&
                summary.map((label) => (
                  <span key={label} className="px-2 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                    {label}
                  </span>
                ))}
              {!hasRisk && !hasSummary && <p className="text-xs text-slate-400">특이사항 없음</p>}
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            {section.description && <p className="text-sm text-slate-500 mt-1">{section.description}</p>}
            <div className="mt-4 space-y-3">
              {section.fields.map((field) => {
                const value = answers[field.id];
                const shouldHide = field.dependsOn && answers[field.dependsOn.id] !== field.dependsOn.value;
                if (shouldHide) return null;
                return (
                  <div key={field.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <span className="text-sm text-slate-600">{field.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{formatValue(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
