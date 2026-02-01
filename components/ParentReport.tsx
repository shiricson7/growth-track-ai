import React from 'react';
import { Patient, GrowthPoint } from '../types';
import { Printer, Download, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { ClinicSettings } from './Settings';

interface ParentReportProps {
  patient: Patient;
  growthData: GrowthPoint[];
  onBack: () => void;
  settings: ClinicSettings;
}

const ParentReport: React.FC<ParentReportProps> = ({ patient, growthData, onBack, settings }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <button onClick={onBack} className="text-slate-600 hover:text-slate-900 font-medium">← 대시보드로 돌아가기</button>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">
            <Printer size={18} /> 인쇄
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
            <Download size={18} /> PDF 다운로드
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white p-12 rounded-none shadow-lg print:shadow-none min-h-[1000px]">
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-8 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">성장 발달 리포트</h1>
            <p className="text-slate-500 mt-2 text-lg"><span className="text-slate-900 font-semibold">{patient.name}</span> 어린이의 부모님께 드리는 보고서</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">GrowthTrack Clinic</div>
            <p className="text-slate-400">담당의: 김닥터 (Dr. Kim)</p>
            <p className="text-slate-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Summary Section - Plain English */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" /> 종합 소견 (Executive Summary)
          </h2>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 leading-relaxed space-y-4">
            <p>
              <span className="font-bold text-slate-900">{patient.name}</span> 어린이는 현재 치료 계획에 매우 양호한 반응을 보이고 있습니다.
              지난 6개월간 키 성장 속도(Height Velocity)가 증가하여, 이전보다 빠르게 성장하고 있음을 확인하였습니다.
            </p>
            <p>
              <strong>골연령(Bone Age)</strong> 평가는 실제 나이(12.5세)보다 약간 앞선 13.8세로 측정되었습니다.
              이는 성조숙증 치료 과정에서 흔히 관찰되는 현상이며, 성장판이 너무 일찍 닫히지 않도록 GnRH 작용제 약물로 적절히 조절되고 있습니다.
            </p>
            <p className="font-medium text-blue-800">
              긍정적 지표: 예측 성인 키(Predicted Adult Height)가 {patient.predictedAdultHeight}cm로 향상되었으며, 이는 유전적 목표 키 범위에 근접한 수치입니다.
            </p>
          </div>
        </div>

        {/* Simplified Chart */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">성장 추이 (Growth Trajectory)</h2>
          <div className="h-[300px] w-full bg-white border border-slate-100 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="age" unit="세" stroke="#94a3b8" />
                <YAxis domain={['auto', 'auto']} unit="cm" stroke="#94a3b8" />
                <Line type="monotone" dataKey="height" stroke="#2563eb" strokeWidth={4} dot={{ r: 6 }} name="현재 성장" />
                <Line type="monotone" dataKey="percentile50" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} name="또래 평균" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-slate-500 mt-2 text-center italic">파란색 실선은 자녀분의 성장 곡선이며, 회색 점선은 같은 나이 또래의 평균 키입니다.</p>
        </div>

        {/* Treatment Plan */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">현재 투약 정보</h3>
            <ul className="space-y-3">
              {patient.medications.map((med, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{med.name}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md">{med.dosage}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">다음 단계 (Next Steps)</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">1.</span> 매일 성장호르몬(GH) 주사 투여 지속.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">2.</span> 다음 GnRH 주사 예정일은 6월 12일입니다.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">3.</span> 3개월 후 추적 혈액검사가 필요합니다.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
          <p>GrowthTrack Clinic • 서울특별시 강남구 테헤란로 123 • (02) 555-1234</p>
        </div>
      </div>
    </div>
  );
};

export default ParentReport;