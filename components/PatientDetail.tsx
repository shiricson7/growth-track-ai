import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, AlertCircle, Brain, Calendar, Syringe, FileText, ClipboardList } from 'lucide-react';
import { Patient, GrowthPoint, LabResult, Measurement } from '../types';

interface PatientDetailProps {
  patient: Patient;
  growthData: GrowthPoint[];
  labResults: LabResult[];
  measurements: Measurement[]; // New prop
  onGenerateReport: () => void;
  aiAnalysis: string[] | null;
  onAnalyzeGrowth: () => void;
  isAnalyzing: boolean;
}

const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  growthData,
  labResults,
  measurements,
  onGenerateReport,
  aiAnalysis,
  onAnalyzeGrowth,
  isAnalyzing
}) => {
  /* Lab History State */
  const [labViewMode, setLabViewMode] = React.useState<'list' | 'trend'>('list');
  const [selectedParameter, setSelectedParameter] = React.useState<string>('');

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
              <div className="flex gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Calendar size={14} /> 생년월일: {patient.dob} (만 {patient.chronologicalAge}세)</span>
                <span className="flex items-center gap-1"><Activity size={14} /> 골연령: <span className="text-red-500 font-semibold">{patient.boneAge}세</span></span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onGenerateReport} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <FileText size={18} />
              보호자용 리포트 생성
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <TrendingUp className="text-blue-600" /> 성장 곡선 (Growth Curve)
            </h2>
            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              <Brain size={14} />
              <span>AI 예측 모델 적용됨</span>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} unit="세" stroke="#64748b" tickCount={8} />
                <YAxis domain={['auto', 'auto']} unit="cm" stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'predicted') return [`${value} cm`, 'AI 예측'];
                    if (name === 'height') return [`${value} cm`, '환자 (Patient)'];
                    return [`${value} cm`, name];
                  }}
                  labelFormatter={(label) => `${label}세`}
                />
                <Legend />
                <Line type="monotone" dataKey="percentile50" stroke="#cbd5e1" strokeDasharray="5 5" name="평균 (50th %)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="percentile97" stroke="#e2e8f0" strokeDasharray="3 3" name="97th %" dot={false} />
                <Line type="monotone" dataKey="percentile3" stroke="#e2e8f0" strokeDasharray="3 3" name="3rd %" dot={false} />
                <Line type="monotone" dataKey="height" stroke="#2563eb" strokeWidth={3} name="환자 (Patient)" activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="predicted" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" name="AI 예측 (Predicted)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold">현재 신장</div>
              <div className="text-xl font-bold text-slate-900">{growthData[5]?.height || '-'} cm</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold">예측 성인 키 (PAH)</div>
              <div className="text-xl font-bold text-purple-600">{patient.predictedAdultHeight} cm</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold">유전적 목표 키 (Mid-P)</div>
              <div className="text-xl font-bold text-slate-600">{patient.targetHeight} cm</div>
            </div>
          </div>
        </div>

        {/* Bone Age Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Activity className="text-red-500" /> 골연령 성숙도 (Bone Age Maturity)
            </h2>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData.filter(d => d.boneAge || d.percentile50)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} unit="세" stroke="#64748b" />
                <YAxis dataKey="boneAge" domain={['auto', 'auto']} unit="세" stroke="#64748b" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [
                    `${value}세`,
                    name === 'boneAge' ? '골연령' : '실제나이'
                  ]}
                  labelFormatter={(label) => `실제나이: ${label}세`}
                />
                <Legend />
                {/* Reference Line y=x */}
                <Line type="monotone" dataKey="age" stroke="#cbd5e1" strokeDasharray="3 3" name="표준 성장 (1:1)" dot={false} />
                <Line type="monotone" dataKey="boneAge" stroke="#ef4444" strokeWidth={3} name="환자 골연령" activeDot={{ r: 6 }} connectNulls />
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
            </h2>
            <div className="space-y-3">
              {patient.medications.map((med, idx) => (
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

          {/* AI Insights */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow-sm border border-indigo-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                <Brain className="text-indigo-600" /> AI 임상 분석 (Gemini)
              </h2>
              <button
                onClick={onAnalyzeGrowth}
                disabled={isAnalyzing}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isAnalyzing ? '분석 중...' : '분석 실행'}
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
                데이터 기반 AI 분석을 실행하려면 버튼을 클릭하세요.
              </div>
            )}
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
                  labResults.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{lab.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{lab.parameter}</td>
                      <td className="px-6 py-4">{lab.value} <span className="text-slate-400 text-xs">{lab.unit}</span></td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 h-[300px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
    </div>
  );
};

export default PatientDetail;