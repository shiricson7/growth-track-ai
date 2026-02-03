'use client';

import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { Save, User, Calendar, Activity, Users, Hash, FileInput } from 'lucide-react';

interface PatientFormProps {
  initialData?: Patient;
  onSave: (patient: Patient) => void;
  onCancel: () => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Patient>>(initialData || {
    name: '',
    dob: '',
    gender: 'Male',
    height: 0,
    weight: 0,
    boneAge: initialData?.boneAge || 0, // Default to 0 as it's removed from registration
    tannerStage: initialData?.tannerStage || '',
    targetHeight: initialData?.targetHeight || 0,
    medications: initialData?.medications || [],
    chartNumber: initialData?.chartNumber || '',
    ssn: initialData?.ssn || '',
    visitDate: initialData?.visitDate || new Date().toISOString().split('T')[0] // Default to today
  });

  const [parentHeight, setParentHeight] = useState({
    father: initialData?.heightFather || 175,
    mother: initialData?.heightMother || 160
  });
  const [ssnInput, setSsnInput] = useState(initialData?.ssn || '');

  // Update formData when ssnInput changes (if manual entry needed, but we mostly drive from ssnInput)
  useEffect(() => {
    if (ssnInput.length === 14) { // 6 digits + hyphen + 7 digits
      const [front, back] = ssnInput.split('-');
      if (front && back && front.length === 6 && back.length >= 1) {
        parseSSN(front, back[0]);
      }
    } else if (ssnInput.length === 13 && !ssnInput.includes('-')) {
      // Auto-insert hyphen
      setSsnInput(ssnInput.replace(/(\d{6})(\d{1})/, '$1-$2'));
    }
  }, [ssnInput]);

  const parseSSN = (front: string, genderDigit: string) => {
    const yearPrefix = (genderDigit === '1' || genderDigit === '2') ? '19' : '20';
    const year = yearPrefix + front.substring(0, 2);
    const month = front.substring(2, 4);
    const day = front.substring(4, 6);

    const dob = `${year}-${month}-${day}`;
    const gender = (genderDigit === '1' || genderDigit === '3') ? 'Male' : 'Female';

    setFormData(prev => ({
      ...prev,
      dob,
      gender
    }));
  };

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and hyphen only
    if (/^[0-9-]*$/.test(val) && val.length <= 14) {
      setSsnInput(val);
    }
  };

  const calculateTargetHeight = () => {
    // Tanner method approximation
    if (formData.gender === 'Male') {
      return (parentHeight.father + parentHeight.mother + 13) / 2;
    } else {
      return (parentHeight.father + parentHeight.mother - 13) / 2;
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    return Number((diff / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullData = {
      ...formData,
      id: formData.id || `PT-${Math.floor(Math.random() * 10000)}`,
      chronologicalAge: calculateAge(formData.dob || ''),
      targetHeight: calculateTargetHeight(),
      predictedAdultHeight: calculateTargetHeight() - 2, // Mock prediction logic
      medications: formData.medications || [],
      ssn: ssnInput,
      chartNumber: formData.chartNumber,
      tannerStage: formData.tannerStage,
      heightFather: parentHeight.father,
      heightMother: parentHeight.mother
    } as Patient;
    onSave(fullData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">환자 정보 등록/수정</h2>
          <p className="text-slate-400 text-sm mt-1">기본 인적사항 및 성장 지표 입력</p>
        </div>
        <div className="bg-slate-800 p-2 rounded-full">
          <User size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Basic Info */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
            <User size={18} className="text-blue-600" /> 기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">환자 성명</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 김민준"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">주민등록번호</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                value={ssnInput}
                onChange={handleSSNChange}
                placeholder="YYMMDD-1234567"
              />
              <p className="text-xs text-slate-500 mt-1">생년월일과 성별이 자동으로 입력됩니다.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">생년월일 (자동)</label>
                <input
                  type="date"
                  disabled
                  className="w-full rounded-lg border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                  value={formData.dob}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">성별 (자동)</label>
                <div className="flex gap-4 p-2">
                  <span className={`flex items-center gap-2 ${formData.gender === 'Male' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === 'Male' ? 'border-blue-600 bg-blue-100' : 'border-slate-300'}`}>
                      {formData.gender === 'Male' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                    </span>
                    남성
                  </span>
                  <span className={`flex items-center gap-2 ${formData.gender === 'Female' ? 'text-pink-600 font-bold' : 'text-slate-400'}`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === 'Female' ? 'border-pink-600 bg-pink-100' : 'border-slate-300'}`}>
                      {formData.gender === 'Female' && <div className="w-2 h-2 rounded-full bg-pink-600"></div>}
                    </span>
                    여성
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">차트 번호 (Chart No.)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-10"
                  value={formData.chartNumber || ''}
                  onChange={e => setFormData({ ...formData, chartNumber: e.target.value })}
                  placeholder="병원 차트 번호 입력"
                />
                <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">검사일 (Visit Date)</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-10"
                  value={formData.visitDate || ''}
                  onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
                />
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

          </div>
        </section>

        {/* Clinical Data */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
            <Activity size={18} className="text-blue-600" /> 임상 데이터
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">현재 신장</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  value={formData.height || ''}
                  onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">cm</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">현재 체중</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  value={formData.weight || ''}
                  onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">kg</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">골연령 (Bone Age)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  value={formData.boneAge || ''}
                  onChange={e => setFormData({ ...formData, boneAge: parseFloat(e.target.value) })}
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">세</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">입력 시 환자 정보의 현재 골연령이 업데이트됩니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">현재 Tanner Stage</label>
              <select
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                value={formData.tannerStage || ''}
                onChange={e => setFormData({ ...formData, tannerStage: e.target.value })}
              >
                <option value="">선택 안 함</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
                <option value="V">V</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">진찰 시점의 현재 Tanner stage를 입력하세요.</p>
            </div>
          </div>
        </section>

        {/* Family History */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
            <Users size={18} className="text-blue-600" /> 가족력 (목표 키 산출용)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">부친 신장</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  value={parentHeight.father}
                  onChange={e => setParentHeight({ ...parentHeight, father: parseFloat(e.target.value) })}
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">cm</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">모친 신장</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  value={parentHeight.mother}
                  onChange={e => setParentHeight({ ...parentHeight, mother: parseFloat(e.target.value) })}
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">cm</span>
              </div>
            </div>
            <div className="md:col-span-2 text-center pt-2">
              <p className="text-sm text-slate-500">
                예상 유전적 목표 키 (Mid-Parental Height): <span className="font-bold text-blue-600 text-lg">{calculateTargetHeight().toFixed(1)} cm</span>
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors"
          >
            <Save size={18} />
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
