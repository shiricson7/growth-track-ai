'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../src/lib/supabase';
import { api } from '../../../src/services/api';
import IntakeQrModal from '../../../components/IntakeQrModal';

interface IntakeRow {
  id: string;
  submitted_at: string;
  status: string;
  token?: string | null;
  patient?: {
    id: string;
    name: string;
    gender: string;
    chart_number?: string | null;
  } | null;
  answers?: {
    flags_json?: Record<string, boolean> | null;
    summary_json?: string[] | null;
  } | null;
}

const filterOptions = [
  { id: 'today', label: '오늘' },
  { id: 'week', label: '이번주' },
  { id: 'all', label: '전체' },
] as const;

type FilterId = (typeof filterOptions)[number]['id'];

const formatDate = (value: string) =>
  new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

export default function IntakesPage() {
  const [filter, setFilter] = useState<FilterId>('today');
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const loadIntakes = async (nextFilter: FilterId) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setHasSession(false);
        setRows([]);
        setLoading(false);
        return;
      }
      setHasSession(true);
      const clinic = await api.getMyClinic();
      if (!clinic?.id) {
        setRows([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('intake_forms')
        .select(
          'id, submitted_at, status, token, patient:patients(id, name, gender, chart_number), answers:intake_answers(flags_json, summary_json)'
        )
        .order('submitted_at', { ascending: false })
        .limit(100);

      if (nextFilter !== 'all') {
        const now = new Date();
        const since = new Date(now);
        if (nextFilter === 'today') {
          since.setHours(0, 0, 0, 0);
        } else {
          since.setDate(now.getDate() - 7);
        }
        query = query.gte('submitted_at', since.toISOString());
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const mapped = (data || []).map((row: any) => ({
        ...row,
        patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
        answers: Array.isArray(row.answers) ? row.answers[0] : row.answers,
      }));
      setRows(mapped as IntakeRow[]);
    } catch (err: any) {
      setError(err?.message || '문진 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntakes(filter);
  }, [filter]);

  const handleShowQr = (token?: string | null) => {
    if (!token) {
      alert('문진 링크가 없습니다.');
      return;
    }
    const origin = window.location.origin;
    setQrUrl(`${origin}/intake/${token}`);
    setQrOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('해당 문진을 삭제할까요? 삭제하면 복구할 수 없습니다.');
    if (!confirmed) return;
    setDeletingId(id);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('intake_forms').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err: any) {
      setError(err?.message || '문진 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">사전문진 제출</h1>
            <p className="text-sm text-slate-500 mt-1">최근 제출된 사전문진을 확인합니다.</p>
          </div>
          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  filter === option.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!hasSession && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            로그인 후 문진 내역을 확인할 수 있습니다.
          </div>
        )}

        {hasSession && loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">로딩 중...</div>
        )}

        {hasSession && !loading && error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-600">{error}</div>
        )}

        {hasSession && !loading && !error && rows.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            표시할 문진이 없습니다.
          </div>
        )}

        {hasSession && !loading && rows.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">제출일</th>
                  <th className="px-4 py-3 text-left">환자</th>
                  <th className="px-4 py-3 text-left">플래그</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const flags = row.answers?.flags_json || {};
                  const summary = row.answers?.summary_json || [];
                  const hasRisk = Object.values(flags).some(Boolean);
                  const hasSummary = summary.length > 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-slate-600">{formatDate(row.submitted_at)}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{row.patient?.name || '-'}</div>
                        <div className="text-xs text-slate-400">
                          차트번호: {row.patient?.chart_number || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {hasRisk && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                              위험
                            </span>
                          )}
                          {hasSummary &&
                            summary.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold"
                              >
                                {label}
                              </span>
                            ))}
                          {!hasRisk && !hasSummary && <span className="text-xs text-slate-400">특이사항 없음</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          {row.status === 'submitted' ? '제출됨' : row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/intakes/${row.id}`}
                            className="text-blue-600 text-sm font-semibold hover:text-blue-700"
                          >
                            상세 보기
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleShowQr(row.token)}
                            className="text-sm font-semibold text-slate-600 hover:text-slate-800"
                          >
                            QR 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                          >
                            {deletingId === row.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrUrl && (
        <IntakeQrModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          url={qrUrl}
        />
      )}
    </div>
  );
}
