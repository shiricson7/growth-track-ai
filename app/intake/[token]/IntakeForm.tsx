'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { intakeSchemaV1, INTAKE_SCHEMA_VERSION, IntakeField, IntakeAnswers } from '../../../src/lib/intake/schema';

interface IntakeFormProps {
  token: string;
  expiresAt: string;
  prefill?: IntakeAnswers;
}

const isEmptyValue = (value: any) => value === undefined || value === null || value === '';

const IntakeForm: React.FC<IntakeFormProps> = ({ token, expiresAt, prefill }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(prefill || {});

  useEffect(() => {
    if (prefill) {
      setAnswers((prev) => ({ ...prefill, ...prev }));
    }
  }, [prefill]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = intakeSchemaV1;
  const section = sections[currentStep];

  const isFieldVisible = (field: IntakeField) => {
    if (!field.dependsOn) return true;
    return answers[field.dependsOn.id] === field.dependsOn.value;
  };

  const visibleFields = useMemo(
    () => section.fields.filter(isFieldVisible),
    [section.fields, answers]
  );

  const updateAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const validateSection = () => {
    const missing = visibleFields
      .filter((field) => field.required)
      .filter((field) => isEmptyValue(answers[field.id]));
    if (missing.length > 0) {
      setError('필수 항목을 입력해 주세요.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateSection()) return;
    setCurrentStep((prev) => Math.min(prev + 1, sections.length - 1));
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateSection()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/intake/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, version: INTAKE_SCHEMA_VERSION }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || '제출에 실패했습니다.');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">문진이 제출되었습니다</h1>
          <p className="text-slate-500 mt-2">의료진이 확인 후 안내드리겠습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">모바일 사전문진</h1>
              <p className="text-sm text-slate-500 mt-1">문진 링크 만료: {new Date(expiresAt).toLocaleString('ko-KR')}</p>
            </div>
            <div className="text-sm text-slate-400">
              {currentStep + 1} / {sections.length}
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${((currentStep + 1) / sections.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            {section.description && <p className="text-sm text-slate-500 mt-1">{section.description}</p>}
          </div>

          <div className="space-y-4">
            {visibleFields.map((field) => {
              const value = answers[field.id];
              if (field.type === 'boolean') {
                return (
                  <div key={field.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-800 mb-3">{field.label}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer(field.id, true)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          value === true
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        예
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer(field.id, false)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          value === false
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        아니오
                      </button>
                    </div>
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <label key={field.id} className="block">
                    <span className="text-sm font-medium text-slate-800">{field.label}</span>
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
                      value={value ?? ''}
                      onChange={(e) => updateAnswer(field.id, e.target.value)}
                    >
                      <option value="">선택</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              if (field.type === 'multi') {
                const current = Array.isArray(value) ? value : [];
                return (
                  <div key={field.id}>
                    <p className="text-sm font-medium text-slate-800 mb-2">{field.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {field.options?.map((option) => (
                        <label
                          key={option}
                          className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${
                            current.includes(option) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={current.includes(option)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateAnswer(field.id, [...current, option]);
                              } else {
                                updateAnswer(
                                  field.id,
                                  current.filter((item) => item !== option)
                                );
                              }
                            }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <label key={field.id} className="block">
                    <span className="text-sm font-medium text-slate-800">{field.label}</span>
                    <textarea
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
                      placeholder={field.placeholder}
                      value={(value as string) ?? ''}
                      onChange={(e) => updateAnswer(field.id, e.target.value)}
                    />
                  </label>
                );
              }

              const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';

              return (
                <label key={field.id} className="block">
                  <span className="text-sm font-medium text-slate-800">{field.label}</span>
                  <div className="mt-2 relative">
                    <input
                      type={inputType}
                      step={field.type === 'number' ? '0.1' : undefined}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
                      placeholder={field.placeholder}
                      value={value ?? ''}
                      onChange={(e) => {
                        if (field.type !== 'number') {
                          updateAnswer(field.id, e.target.value);
                          return;
                        }
                        const raw = e.target.value;
                        updateAnswer(field.id, raw === '' ? '' : Number(raw));
                      }}
                    />
                    {field.unit && (
                      <span className="absolute right-3 top-2 text-xs text-slate-400">{field.unit}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
            >
              이전
            </button>
            {currentStep < sections.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60"
              >
                {submitting ? '제출 중...' : '제출'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeForm;
