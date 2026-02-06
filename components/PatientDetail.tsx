'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, AlertCircle, Brain, Calendar, Syringe, ClipboardList, Ruler, Settings } from 'lucide-react';
import { Patient, GrowthPoint, LabResult, Measurement } from '../types';

import { growthStandards } from '../src/utils/growthStandards';
import { calculateIGF1Percentile, getAgeYearsAtDate, isIGF1Parameter, isLikelyNgMlUnit } from '../src/utils/igf1Roche';
import { aiEnabled } from '../src/services/ai';
import BoneAgeHistory from './BoneAgeHistory';
import IntakeQrModal from './IntakeQrModal';

const CHART_COLORS = {
  patient: '#2f4b76',
  predicted: '#1aa79c',
  median: '#64748b',
  band: '#cbd5e1',
  bone: '#dc2626',
};

interface PatientDetailProps {
  patient: Patient;
  growthData: GrowthPoint[];
  labResults: LabResult[];
  measurements: Measurement[]; // New prop
  aiAnalysis: string[] | null;
  aiPredictedHeight?: number; // New prop
  onAnalyzeGrowth: () => void;
  isAnalyzing: boolean;
  onRefresh: () => void; // Added for refreshing data after edits
  onManageMedication?: () => void; // Added
  onEditPatient?: () => void;
  intakeLink?: { url: string; expiresAt: string } | null;
  intakeLinkLoading?: boolean;
  onCreateIntakeLink?: () => void;
  accessLevel?: 'owner' | 'staff' | 'tablet';
}

const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  growthData,
  labResults,
  measurements,
  aiAnalysis,
  aiPredictedHeight,
  onAnalyzeGrowth,
  isAnalyzing,
  onRefresh,
  onManageMedication,
  onEditPatient,
  intakeLink,
  intakeLinkLoading,
  onCreateIntakeLink,
  accessLevel = 'owner'
}) => {
  /* Lab History State */
  const [labViewMode, setLabViewMode] = React.useState<'list' | 'trend'>('list');
  const [showBoneAgeHistory, setShowBoneAgeHistory] = React.useState(false);
  const [selectedParameter, setSelectedParameter] = React.useState<string>('');
  const [qrOpen, setQrOpen] = React.useState(false);

  const showClinicalSections = accessLevel === 'owner';
  const showPatientInfoDetails = accessLevel !== 'tablet';
  const showEditControls = accessLevel === 'owner';

  // Sorting measurements for history list
  const sortedMeasurements = [...measurements]
    .filter(m => m.height > 0 || m.weight > 0) // Only show records with physical measurements
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Extract unique parameters for dropdown
  const availableParameters = Array.from(new Set(labResults.map(l => l.parameter))).sort();

  // Set default parameter if not selected and available
  React.useEffect(() => {
    if (!selectedParameter && availableParameters.length > 0) {
      setSelectedParameter(availableParameters[0]);
    }
  }, [availableParameters, selectedParameter]);

  // Filter data for trend chart
  const trendData = labResults
    .filter(l => l.parameter === selectedParameter)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Load growth standards
  React.useEffect(() => {
    growthStandards.load();
  }, []);

  const aiAvailable = aiEnabled;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Patient Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              {showPatientInfoDetails && (
              <div className="flex gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Calendar size={14} /> 생년월일: {patient.dob} (만 {Number.isFinite(patient.chronologicalAge) ? patient.chronologicalAge.toFixed(1) : '-'}세)</span>
                {/* Find latest bone age from sorted measurements or fallback to patient record */}
                <span className="flex items-center gap-1">
                  <Activity size={14} /> 골연령:
                  <span className="text-red-500 font-semibold">
                    {sortedMeasurements.find(m => m.boneAge && m.boneAge > 0)?.boneAge || patient.boneAge || '-'}세
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Ruler size={14} /> 목표지 (MPH):
                  <span className="text-blue-500 font-semibold">
                    {/* Calculate Mid-Parental Height based on Gender */}
                    {(() => {
                      // Assuming we have father/mother height in patient object, or defaults
                      // Since types.ts didn't explicitly show fatherHeight/motherHeight, I'll check if they exist or use patient.targetHeight if pre-calculated.
                      // Looking at types.ts, patient.targetHeight exists. But user asked for formula calculation.
                      // I will assume the pre-calculated calculation in App/PatientForm might be checking this, or I'll implement it here if I can access parent heights.
                      // Wait, types.ts shows patient has `targetHeight`. Let's assume that is the MPH.
                      // But the user said "formula is ... confirm if patient is male or female".
                      // I'll stick to displaying `patient.targetHeight` but I should verify HOW it was calculated.
                      // Actually, let's just use patient.targetHeight for now, but I'll add a check if it seems wrong or just trust the backend/form logic?
                      // User request: "Use the formula... check gender".
                      // If I don't have parent heights here, I can't recalculate.
                      // Let's rely on patient.targetHeight but update the FORM/Calculation logic where it's created.
                      // However, if the user implies the displayed value is wrong, maybe I should check `PatientForm` or where `targetHeight` comes from.
                      // For this file, let's display what we have.
                      return patient.targetHeight;
                    })()} cm
                  </span>
                </span>
              </div>
              )}
            </div>
          </div>
          {showEditControls && (
          <div className="flex gap-3">
            <button
              onClick={onEditPatient}
              disabled={!onEditPatient}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Settings size={18} />
              환자 정보 수정
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Intake Link */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList size={18} className="text-blue-600" />
              사전문진 링크
            </h2>
            <p className="text-sm text-slate-500 mt-1">보호자에게 공유할 문진 링크를 생성합니다.</p>
          </div>
          <button
            onClick={onCreateIntakeLink}
            disabled={!onCreateIntakeLink || intakeLinkLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {intakeLinkLoading ? '생성 중...' : '문진 링크 생성'}
          </button>
        </div>

        {intakeLink && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={intakeLink.url}
                readOnly
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(intakeLink.url);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                복사
              </button>
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                QR 보기
              </button>
            </div>
            <p className="text-xs text-slate-400">만료: {new Date(intakeLink.expiresAt).toLocaleString('ko-KR')}</p>
          </div>
        )}
      </div>

      {intakeLink && (
        <IntakeQrModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          url={intakeLink.url}
          expiresAt={intakeLink.expiresAt}
        />
      )}

      {showClinicalSections && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <TrendingUp className="text-blue-600" /> 성장 곡선 (Growth Curve)
            </h2>
            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              <Brain size={14} />
              <span>{aiAvailable ? 'AI 예측 모델 적용됨' : 'AI 비활성 (API 키 필요)'}</span>
            </div>
          </div>

          <div className="h-[350px] min-h-[350px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={300}>
              <LineChart data={growthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="age"
                  type="number"
                  domain={[0, 19]}
                  unit="세"
                  stroke="#64748b"
                  tickCount={10}
                  ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18]}
                />
                <YAxis
                  domain={[40, 190]}
                  unit="cm"
                  stroke="#64748b"
                  tickCount={8}
                />


                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'predicted') return [`${value.toFixed(1)} cm`, 'AI 예측'];
                    if (name === 'height' || name === '환자 (Patient)') {
                      // Use LMS utility
                      const age = props.payload.age;
                      const percentile = growthStandards.calculatePercentile(patient.gender, age, value);
                      const percentileStr = percentile ? ` (${percentile.toFixed(1)}th %)` : '';
                      return [`${value} cm${percentileStr}`, '환자 (Patient)'];
                    }
                    return [`${value} cm`, name];
                  }}
                  labelFormatter={(label) => `${label}세`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentile50"
                  stroke={CHART_COLORS.median}
                  strokeDasharray="5 5"
                  name="평균 (50th %)"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="percentile97"
                  stroke={CHART_COLORS.band}
                  strokeDasharray="3 3"
                  name="97th %"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="percentile3"
                  stroke={CHART_COLORS.band}
                  strokeDasharray="3 3"
                  name="3rd %"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="height"
                  stroke={CHART_COLORS.patient}
                  strokeWidth={3}
                  name="환자 (Patient)"
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={CHART_COLORS.predicted}
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  name="AI 예측 (Predicted)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-bold mb-1">현재 키 (Current Height)</p>
              <p className="text-2xl font-bold text-slate-900">
                {sortedMeasurements.find(m => m.height && m.height > 0)?.height || '-'}
                <span className="text-sm font-normal text-slate-500 ml-1">cm</span>
                {(() => {
                  const latest = sortedMeasurements.find(m => m.height && m.height > 0);
                  if (latest && latest.height) {
                    // We need age at that measurement. derived from date?
                    // measurement has `date`. patient has `dob`.
                    // Calculate age at measurement time
                    const mDate = new Date(latest.date);
                    const dob = new Date(patient.dob);
                    const ageYears = (mDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

                    const p = growthStandards.calculatePercentile(patient.gender, ageYears, latest.height);
                    if (p) {
                      return (
                        <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${p < 3 || p > 97 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.toFixed(1)}th
                        </span>
                      );
                    }
                  }
                  return null;
                })()}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {sortedMeasurements.find(m => m.height && m.height > 0)?.date || '기록 없음'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-xs text-purple-600 font-bold mb-1">골연령 (Bone Age)</p>
              <p className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {sortedMeasurements.find(m => Number(m.boneAge) > 0)?.boneAge || patient.boneAge || '-'}
                <span className="text-sm font-normal text-slate-500">세</span>
              </p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-slate-400">
                  {sortedMeasurements.find(m => Number(m.boneAge) > 0)?.date ? '최신 측정' : '초기값'}
                </p>
                <button
                  onClick={() => setShowBoneAgeHistory(true)}
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-200 transition-colors"
                >
                  기록 / 수정
                </button>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs text-emerald-600 font-bold mb-1">예측 성인 키 (PAH)</p>
              <p className="text-2xl font-bold text-slate-900">
                {aiPredictedHeight || patient.predictedAdultHeight}
                <span className="text-sm font-normal text-slate-500 ml-1">cm</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">AI 예측 모델</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-600 font-bold mb-1">Tanner Stage</p>
              <p className="text-2xl font-bold text-slate-900">
                {patient.tannerStage || '-'}
              </p>
              <p className="text-xs text-slate-400 mt-1">현재 성성숙도</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs text-orange-600 font-bold mb-1">유전적 목표 키 (Target)</p>
              <p className="text-2xl font-bold text-slate-900">
                {patient.targetHeight.toFixed(1)}
                <span className="text-sm font-normal text-slate-500 ml-1">cm</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Mid-Parental</p>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow-sm border border-indigo-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-900">
              <Brain className="text-indigo-600" /> AI 임상 분석 (GPT-5.2)
            </h2>
            <button
              onClick={onAnalyzeGrowth}
              disabled={isAnalyzing || !aiAvailable}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {!aiAvailable ? 'AI 비활성' : isAnalyzing ? '분석 중...' : '분석 실행'}
            </button>
          </div>

          {aiAnalysis ? (
            <ul className="space-y-3">
              {aiAnalysis.map((insight, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-indigo-900 leading-relaxed text-justify">
                  <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-indigo-400" />
                  <div dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-indigo-400 text-center py-4">
              {aiAvailable
                ? '데이터 기반 AI 분석을 실행하려면 버튼을 클릭하세요.'
                : 'AI 기능이 비활성화되어 있습니다. API 키 설정 후 사용 가능합니다.'}
            </div>
          )}
        </div>

        {/* Bone Age Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Activity className="text-red-500" /> 골연령 성숙도 (Bone Age Maturity)
            </h2>
          </div>
          <div className="h-[250px] min-h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
              <LineChart
                data={growthData.filter(
                  (d) => (d as any).boneAge || (d as any).percentile50
                )}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} unit="세" stroke="#64748b" />
                <YAxis dataKey="boneAge" domain={['auto', 'auto']} unit="세" stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'boneAge') return [`${value}세`, '골연령 (Bone Age)'];
                    if (name === 'age') return [`${value}세`, '표준 성장 (Standard)'];
                    return [`${value}세`, name];
                  }}
                  labelFormatter={(label) => `만 나이: ${label}세`}
                />
                <Legend />
                {/* Reference Line y=x */}
                <Line
                  type="monotone"
                  dataKey="age"
                  stroke={CHART_COLORS.band}
                  strokeDasharray="3 3"
                  name="표준 성장 (1:1)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="boneAge"
                  stroke={CHART_COLORS.bone}
                  strokeWidth={3}
                  name="환자 골연령"
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: AI Analysis & Active Meds */}
        <div className="space-y-6">

          {/* Active Medications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-800">
              <Syringe className="text-green-600" /> 투약 프로토콜
              <button
                onClick={() => onManageMedication?.()}
                className="ml-auto text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                관리 (Manage)
              </button>
            </h2>
            <div className="space-y-3">
              {patient.medications
                .filter(med => med.status !== 'completed') // Hide completed meds
                .map((med, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${med.type === 'GH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {med.type}
                      </span>
                      <span className="text-xs text-slate-500">시작일: {med.startDate}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-2">{med.name}</h3>
                    <div className="text-sm text-slate-600 mt-1 flex justify-between">
                      <span>{med.dosage}</span>
                      <span>{med.frequency}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Measurement History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-800">
              <ClipboardList className="text-blue-600" /> 신체 계측 기록 (History)
            </h2>
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">날짜</th>
                    <th className="px-3 py-2">신장</th>
                    <th className="px-3 py-2">체중</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedMeasurements.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">기록이 없습니다.</td></tr>
                  ) : (
                    sortedMeasurements.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{m.date}</td>
                        <td className="px-3 py-2 font-medium">{m.height ? `${m.height} cm` : '-'}</td>
                        <td className="px-3 py-2 text-slate-500">{m.weight ? `${m.weight} kg` : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Labs & Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Activity className="text-teal-600" /> 혈액 검사 기록 (Lab History)
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setLabViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${labViewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                목록 (List)
              </button>
              <button
                onClick={() => setLabViewMode('trend')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${labViewMode === 'trend' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                추세 (Trend)
              </button>
            </div>
          </div>
          {labViewMode === 'trend' && (
            <select
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              {availableParameters.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {labViewMode === 'list' ? (
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-6 py-3">날짜 (Date)</th>
                  <th className="px-6 py-3">항목 (Parameter)</th>
                  <th className="px-6 py-3">결과값 (Result)</th>
                  <th className="px-6 py-3">참고치 (Reference)</th>
                  <th className="px-6 py-3">상태 (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labResults.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">검사 결과가 없습니다.</td></tr>
                ) : (
                  labResults.map((lab) => {
                    const isIgf1 = isIGF1Parameter(lab.parameter);
                    const ageAtLab = isIgf1 ? getAgeYearsAtDate(patient.dob, lab.date) : null;
                    const igf1Percentile =
                      isIgf1 && isLikelyNgMlUnit(lab.unit)
                        ? calculateIGF1Percentile(lab.value, ageAtLab, patient.gender)
                        : null;
                    return (
                    <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{lab.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{lab.parameter}</td>
                      <td className="px-6 py-4">
                        {lab.value} <span className="text-slate-400 text-xs">{lab.unit}</span>
                        {igf1Percentile !== null && (
                          <div className="text-xs text-slate-500 mt-1">
                            IGF-1 퍼센타일: {igf1Percentile.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{lab.referenceRange}</td>
                      <td className="px-6 py-4">
                        {lab.status === 'normal' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle size={12} className="mr-1" /> {lab.status.toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 h-[300px] min-h-[300px] w-full min-w-0">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value, selectedParameter]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} name={selectedParameter} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">데이터가 없습니다.</div>
            )}
          </div>
        )}
      </div>
      {/* Bone Age History Modal */}
      {showBoneAgeHistory && (
        <BoneAgeHistory
          patient={patient}
          measurements={measurements}
          onClose={() => setShowBoneAgeHistory(false)}
          onUpdate={onRefresh}
        />
      )}
      )}
    </div>
  );
};

export default PatientDetail;
