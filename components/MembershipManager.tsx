'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, Users } from 'lucide-react';
import { api } from '../src/services/api';
import { ClinicInfo, ClinicMember, ClinicRole } from '../types';

interface MembershipManagerProps {
  clinic: ClinicInfo;
  currentUserId?: string;
}

const roleOptions: { value: ClinicRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'staff', label: '직원' },
  { value: 'tablet', label: '태블릿' },
];

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
};

const normalizeRole = (role: ClinicRole) => (role === 'member' ? 'staff' : role);

const MembershipManager: React.FC<MembershipManagerProps> = ({ clinic, currentUserId }) => {
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getClinicMembers(clinic.id);
      setMembers(rows);
    } catch (err: any) {
      setError(err?.message || '멤버 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) {
      loadMembers();
    }
  }, [clinic?.id]);

  const ownerCount = useMemo(
    () => members.filter((m) => normalizeRole(m.role) === 'owner').length,
    [members]
  );

  const handleRoleChange = async (memberId: string, nextRole: ClinicRole) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    if (normalizeRole(target.role) === nextRole) return;

    setSavingId(memberId);
    try {
      await api.updateClinicMemberRole(memberId, nextRole === 'member' ? 'staff' : nextRole);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: nextRole } : m)));
    } catch (err: any) {
      setError(err?.message || '역할 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyCode = async () => {
    if (!clinic.clinicCode) return;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(clinic.clinicCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> 멤버십 관리
            </h2>
            <p className="text-sm text-slate-500 mt-1">클리닉 멤버들의 역할과 권한을 관리할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={loadMembers}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>
      </div>

      {clinic.clinicCode && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-700">클리닉 코드 (멤버 초대용)</h3>
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <input
              value={clinic.clinicCode}
              readOnly
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white flex items-center gap-2"
            >
              <Copy size={14} /> {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">직원/태블릿 계정은 초대 코드로 가입할 수 있습니다.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm text-slate-500">현재 Owner: {ownerCount}명</p>
        </div>

        {loading && (
          <div className="p-6 text-center text-slate-500">멤버를 불러오는 중...</div>
        )}

        {!loading && error && (
          <div className="p-6 text-center text-red-600 bg-red-50">{error}</div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">이메일</th>
                  <th className="px-6 py-3">권한</th>
                  <th className="px-6 py-3">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">등록된 멤버가 없습니다.</td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const isSelf = currentUserId && member.userId === currentUserId;
                    const normalized = normalizeRole(member.role);
                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{member.email || member.userId}</div>
                          {member.email && (
                            <div className="text-xs text-slate-400 mt-1">{member.userId}</div>
                          )}
                          {isSelf && (
                            <div className="text-xs text-blue-600 mt-1">내 계정</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={normalized}
                            disabled={isSelf || savingId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as ClinicRole)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(member.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipManager;
