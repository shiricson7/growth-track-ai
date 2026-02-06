'use client';

import React, { useState } from 'react';
import { Building2, KeyRound } from 'lucide-react';
import { api } from '../src/services/api';
import { ClinicInfo } from '../types';
import { supabase } from '../src/lib/supabase';

interface ClinicOnboardingProps {
  onComplete: () => void;
  initialClinicName?: string;
  externalError?: string | null;
}

const ClinicOnboarding: React.FC<ClinicOnboardingProps> = ({ onComplete, initialClinicName, externalError }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [clinicName, setClinicName] = useState(initialClinicName || '');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClinic, setCreatedClinic] = useState<ClinicInfo | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const clinic = await api.createClinic(clinicName.trim());
      setCreatedClinic(clinic);
    } catch (err: any) {
      setError(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.joinClinicByCode(joinCode.trim());
      onComplete();
    } catch (err: any) {
      setError(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur rounded-2xl shadow-soft border border-slate-200/80 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">클리닉 설정</h1>
            <p className="text-slate-500 text-sm mt-1">팀으로 환자 데이터를 공유하세요.</p>
          </div>
          <button
            className="text-sm text-slate-500 hover:text-slate-700"
            onClick={() => supabase.auth.signOut()}
          >
            로그아웃
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'create' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setMode('create')}
          >
            클리닉 생성
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === 'join' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setMode('join')}
          >
            클리닉 참여
          </button>
        </div>

        {mode === 'create' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">클리닉 이름</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-9"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="예) GrowthTrack Clinic"
                />
              </div>
            </div>

            {createdClinic ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm">
                <div className="font-bold text-emerald-700">클리닉이 생성되었습니다.</div>
                <div className="text-emerald-700 mt-1">초대 코드: <span className="font-mono font-semibold">{createdClinic.clinicCode}</span></div>
                <button
                  className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold"
                  onClick={onComplete}
                >
                  시작하기
                </button>
              </div>
            ) : (
              <button
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-bold hover:bg-blue-700 disabled:opacity-50"
                onClick={handleCreate}
                disabled={loading || clinicName.trim().length === 0}
              >
                {loading ? '처리 중...' : '클리닉 생성'}
              </button>
            )}
          </div>
        )}

        {mode === 'join' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">클리닉 코드</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-9"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                placeholder="예) a1b2c3d4"
                />
              </div>
            </div>
            <button
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-bold hover:bg-blue-700 disabled:opacity-50"
              onClick={handleJoin}
              disabled={loading || joinCode.trim().length === 0}
            >
              {loading ? '처리 중...' : '클리닉 참여'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>
        )}
        {!error && externalError && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {externalError}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicOnboarding;
