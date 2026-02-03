'use client';

import React from 'react';
import { Patient, GrowthPoint, LabResult } from '../types';
import { Printer, Download, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { aiEnabled, aiService } from '../src/services/ai';
import { growthStandards } from '../src/utils/growthStandards';
import { bmiStandards } from '../src/utils/bmiStandards';
import { weightStandards } from '../src/utils/weightStandards';
import { ClinicSettings } from './Settings';
import { api } from '../src/services/api';

const splitReportContent = (content: string) => {
  if (!content) return { summaryContent: '', restContent: '' };
  const summaryIndex = content.indexOf('# 종합 요약');
  if (summaryIndex === -1) {
    return { summaryContent: content, restContent: '' };
  }
  const nextHeaderIndex = content.indexOf('\n## ', summaryIndex + 1);
  if (nextHeaderIndex === -1) {
    return { summaryContent: content, restContent: '' };
  }
  return {
    summaryContent: content.slice(0, nextHeaderIndex).trim(),
    restContent: content.slice(nextHeaderIndex).trimStart()
  };
};

const buildGrowthPolyline = (points: GrowthPoint[]) => {
  const width = 320;
  const height = 120;
  const padding = 16;
  if (points.length < 2) return { width, height, polyline: '', dots: [] as { cx: number; cy: number }[] };

  const ages = points.map((p) => p.age);
  const heights = points.map((p) => p.height);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);

  const ageSpan = maxAge - minAge || 1;
  const heightSpan = maxHeight - minHeight || 1;

  const dots = points.map((p) => {
    const cx = padding + ((p.age - minAge) / ageSpan) * (width - padding * 2);
    const cy = height - padding - ((p.height - minHeight) / heightSpan) * (height - padding * 2);
    return { cx, cy };
  });

  const polyline = dots.map((d) => `${d.cx},${d.cy}`).join(' ');
  return { width, height, polyline, dots };
};

const REPORT_COLORS = {
  patient: '#2f4b76',
  predicted: '#1aa79c',
  median: '#94a3b8',
};

const RecentGrowthSummary: React.FC<{ points: GrowthPoint[]; velocity: number | null }> = ({ points, velocity }) => {
  const recentPoints = points.length > 5 ? points.slice(-5) : points;
  const velocityText = Number.isFinite(velocity)
    ? `최근 성장속도는 ${velocity?.toFixed(1)} cm/년 입니다.`
    : '최근 성장속도는 데이터가 부족해 계산할 수 없습니다.';

  return (
    <div className="mt-6 border border-slate-200 rounded-xl bg-white p-4">
      <div className="text-sm font-semibold text-slate-800 mb-3">최근 성장 추이</div>
      {recentPoints.length < 2 ? (
        <p className="text-sm text-slate-500">최근 성장 데이터가 충분하지 않습니다.</p>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 h-[120px] min-h-[120px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={220} minHeight={110}>
              <LineChart data={recentPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="age"
                  unit="세"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  unit="cm"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  width={32}
                />
                <Line
                  type="monotone"
                  dataKey="height"
                  stroke={REPORT_COLORS.patient}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-sm text-slate-700 whitespace-nowrap">{velocityText}</div>
        </div>
      )}
    </div>
  );
};

// Simple Markdown Renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  const sections = content.split(/\n(?=# )/g); // Split by top level headers

  return (
    <div className="space-y-6 text-slate-700 leading-relaxed">
      {sections.map((section, idx) => {
        const lines = section.split('\n');
        const header = lines[0];
        const body = lines.slice(1).join('\n');

        let headerEl = null;
        if (header.startsWith('# ')) {
          headerEl = <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 mt-8 border-b border-slate-100 pb-2">{header.replace('# ', '')}</h2>;
        } else if (header.startsWith('## ')) {
          headerEl = <h3 className="text-lg font-bold text-slate-800 mb-3 mt-6">{header.replace('## ', '')}</h3>;
        } else if (header.startsWith('### ')) {
          headerEl = <h4 className="text-md font-bold text-slate-800 mb-2 mt-4">{header.replace('### ', '')}</h4>;
        }

        // Parse body for bold **text**
        const parsedBody = body.split('\n').map((line, i) => {
          if (line.trim().length === 0) return <br key={i} />;
          // Check if it's a list item
          if (line.trim().startsWith('- ')) {
            const text = line.trim().substring(2);
            return (
              <li key={i} className="ml-4 list-disc mb-1">
                {text.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} className="text-slate-900">{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </li>
            );
          }

          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={i} className="mb-1">
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j} className="text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </p>
          );
        });

        return (
          <div key={idx}>
            {headerEl}
            {parsedBody}
          </div>
        );
      })}
    </div>
  );
};

interface ParentReportProps {
  patient: Patient;
  growthData: GrowthPoint[];
  labResults: LabResult[];
  onBack: () => void;
  settings: ClinicSettings;
  aiPredictedHeight?: number;
}

const ParentReport: React.FC<ParentReportProps> = ({ patient, growthData, labResults, onBack, settings, aiPredictedHeight }) => {
  const [reportContent, setReportContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [reportPredictedHeight, setReportPredictedHeight] = React.useState<number | undefined>(aiPredictedHeight);
  const [standardsReady, setStandardsReady] = React.useState(false);
  const [bmiStandardsReady, setBmiStandardsReady] = React.useState(false);
  const [weightStandardsReady, setWeightStandardsReady] = React.useState(false);
  const { summaryContent, restContent } = React.useMemo(() => splitReportContent(reportContent), [reportContent]);
  const growthSeries = React.useMemo(() => {
    return (growthData || [])
      .filter((p) => Number.isFinite(p.age) && Number.isFinite(p.height))
      .sort((a, b) => a.age - b.age);
  }, [growthData]);
  const latestMeasurement = React.useMemo(() => {
    const patientPoints = (growthData || []).filter((p: any) => (p as any).isPatient && ((p as any).height || (p as any).weight));
    if (patientPoints.length === 0) return null;
    return [...patientPoints].sort((a: any, b: any) => {
      if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
      return (b.age ?? 0) - (a.age ?? 0);
    })[0];
  }, [growthData]);
  const latestHeight = typeof latestMeasurement?.height === 'number' ? latestMeasurement.height : null;
  const latestWeight = typeof latestMeasurement?.weight === 'number' ? latestMeasurement.weight : null;
  const latestAge = typeof latestMeasurement?.age === 'number' ? latestMeasurement.age : null;
  const bmiValue =
    latestHeight && latestWeight ? latestWeight / Math.pow(latestHeight / 100, 2) : null;
  const heightPercentile = React.useMemo(() => {
    if (!standardsReady || !latestAge || !latestHeight) return null;
    return growthStandards.calculatePercentile(patient.gender, latestAge, latestHeight);
  }, [standardsReady, latestAge, latestHeight, patient.gender]);
  const weightPercentile = React.useMemo(() => {
    if (!weightStandardsReady || !latestAge || !latestWeight) return null;
    return weightStandards.calculatePercentile(patient.gender, latestAge, latestWeight);
  }, [weightStandardsReady, latestAge, latestWeight, patient.gender]);
  const bmiPercentile = React.useMemo(() => {
    if (!bmiStandardsReady || !latestAge || !bmiValue) return null;
    return bmiStandards.calculatePercentile(patient.gender, latestAge, bmiValue);
  }, [bmiStandardsReady, latestAge, bmiValue, patient.gender]);
  const recentGrowthVelocity = React.useMemo(() => {
    if (growthSeries.length < 2) return null;
    const windowSize = growthSeries.length >= 4 ? 4 : Math.min(3, growthSeries.length);
    const windowPoints = growthSeries.slice(-windowSize);
    const first = windowPoints[0];
    const last = windowPoints[windowPoints.length - 1];
    const ageDiff = last.age - first.age;
    if (ageDiff <= 0) return null;
    return (last.height - first.height) / ageDiff;
  }, [growthSeries]);

  React.useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  React.useEffect(() => {
    growthStandards.load().then(() => setStandardsReady(true));
    bmiStandards.load().then(() => setBmiStandardsReady(true));
    weightStandards.load().then(() => setWeightStandardsReady(true));
  }, []);

  React.useEffect(() => {
    if (!isPrinting) return;
    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => window.print());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isPrinting]);

  React.useEffect(() => {
    const loadCached = async () => {
      setLoading(true);
      try {
        const cached = await api.getAiReport(patient.id, 'parent_report');
        if (cached?.markdownReport) {
          setReportContent(cached.markdownReport);
          setLastUpdated(cached.updatedAt || null);
        } else {
          setReportContent('');
        }
      } catch (e) {
        setReportContent('');
      } finally {
        setLoading(false);
      }
    };
    loadCached();
  }, [patient.id]);

  React.useEffect(() => {
    if (Number.isFinite(aiPredictedHeight)) {
      setReportPredictedHeight(aiPredictedHeight);
    }
  }, [aiPredictedHeight]);

  const handleGenerateReport = async () => {
    if (!aiEnabled) {
      setReportContent('# AI 비활성화\n\n관리자에게 API 키 설정을 요청해주세요.');
      return;
    }
    setLoading(true);
    try {
      const report = await aiService.generateParentReport(patient, labResults, patient.medications);
      setReportContent(report);
      setLastUpdated(new Date().toISOString());
      await api.upsertAiReport({
        patientId: patient.id,
        kind: 'parent_report',
        markdownReport: report,
        sourceModel: 'gpt-5.2-2025-12-11',
      });
    } catch (e) {
      setReportContent('# 리포트 생성 실패\n\n죄송합니다. AI 서비스 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 print-report-container">
      <div className="screen-only space-y-8">
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print-hidden">
          <button onClick={onBack} className="text-slate-600 hover:text-slate-900 font-medium">← 대시보드로 돌아가기</button>
          <div className="flex gap-3 items-center">
            {lastUpdated && (
              <span className="text-xs text-slate-400">최근 생성: {new Date(lastUpdated).toLocaleDateString()}</span>
            )}
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50"
            >
              <Star size={18} /> AI 리포트 새로 생성
            </button>
            <button
              onClick={() => setIsPrinting(true)}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50"
            >
              <Printer size={18} /> 인쇄
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
              <Download size={18} /> PDF 다운로드
            </button>
          </div>
        </div>

        {/* Report Content (Screen) */}
        <div className="bg-white p-12 rounded-none shadow-lg min-h-[1000px] print-report">
          {/* Header */}
          <div className="border-b-4 border-blue-600 pb-8 mb-8 flex justify-between items-start print-section">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">성장 발달 리포트</h1>
              <p className="text-slate-500 mt-2 text-lg"><span className="text-slate-900 font-semibold">{patient.name}</span> 어린이의 부모님께 드리는 보고서</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{settings?.hospitalName || 'GrowthTrack Clinic'}</div>
              <p className="text-slate-400">담당의: {settings?.doctorName || ''}</p>
              <p className="text-slate-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* AI Generated Content */}
          <div className="mb-10 min-h-[300px] print-allow-break">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-slate-500">AI가 환자의 데이터를 분석하여 리포트를 작성 중입니다...</p>
                <p className="text-xs text-slate-400">약 5-10초 정도 소요됩니다.</p>
              </div>
            ) : reportContent ? (
              <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 print-allow-break">
                {summaryContent && restContent ? (
                  <>
                    <MarkdownRenderer content={summaryContent} />
                    <RecentGrowthSummary points={growthSeries} velocity={recentGrowthVelocity} />
                    <MarkdownRenderer content={restContent} />
                  </>
                ) : (
                  <>
                    <MarkdownRenderer content={reportContent} />
                    <RecentGrowthSummary points={growthSeries} velocity={recentGrowthVelocity} />
                  </>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 text-slate-500">
                저장된 AI 리포트가 없습니다. 상단의 “AI 리포트 새로 생성” 버튼을 눌러 생성해주세요.
              </div>
            )}
          </div>

          {/* Simplified Chart */}
          <div className="mb-10 print-section">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold text-slate-800">성장 추이 (Growth Trajectory)</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 border border-blue-100">
                  <span className="h-2 w-2 rounded-full bg-blue-700" />
                  현재 성장
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 text-slate-600 px-3 py-1 border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  또래 평균
                </span>
                {patient.predictedAdultHeight > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 border border-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    AI 예측
                  </span>
                )}
              </div>
            </div>
            <div className="h-[320px] min-h-[320px] w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={220}>
                <LineChart data={growthData} margin={{ top: 10, right: 24, left: 8, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="age"
                    unit="세"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    unit="cm"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke={REPORT_COLORS.patient}
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 5 }}
                    name="현재 성장"
                  />
                  <Line
                    type="monotone"
                    dataKey="percentile50"
                    stroke={REPORT_COLORS.median}
                    strokeDasharray="6 6"
                    strokeWidth={2}
                    dot={false}
                    name="또래 평균"
                  />
                  {patient.predictedAdultHeight > 0 && (
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke={REPORT_COLORS.predicted}
                      strokeDasharray="4 4"
                      strokeWidth={2.5}
                      dot={false}
                      name="AI 예측"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              실선은 실제 측정값, 점선은 또래 평균/예측 참고선입니다.
            </p>
          </div>

          {/* Current Status Table */}
          <div className="mt-10 print-section">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800">현재 체격 요약</h3>
                <span className="text-xs text-slate-400">
                  기준일: {latestMeasurement?.date || '기록 없음'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">현재 키</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {latestHeight ? latestHeight.toFixed(1) : '-'}
                    </span>
                    <span className="text-sm text-slate-500">cm</span>
                  </div>
                  {heightPercentile !== null && (
                    <span className="inline-flex mt-2 items-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold">
                      키 백분위 {heightPercentile.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">현재 체중</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {latestWeight ? latestWeight.toFixed(1) : '-'}
                    </span>
                    <span className="text-sm text-slate-500">kg</span>
                  </div>
                  {weightPercentile !== null && (
                    <span className="inline-flex mt-2 items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                      체중 백분위 {weightPercentile.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50">
                  <div className="text-xs text-blue-700 mb-1 font-semibold">BMI 백분위</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-blue-700">
                      {bmiPercentile !== null ? bmiPercentile.toFixed(1) : '-'}
                    </span>
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    BMI {bmiValue ? bmiValue.toFixed(1) : '-'} kg/m²
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm print-section">
            <p>{settings?.hospitalName || 'GrowthTrack Clinic'} • {settings?.address || ''} • {settings?.phone || ''}</p>
          </div>
        </div>
      </div>

      {/* Print-only layout */}
      <div className="print-only print-report">
        <div className="print-section">
          <div className="flex items-start justify-between border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">성장 발달 리포트</h1>
              <p className="text-sm text-slate-600 mt-1">{patient.name} 어린이 보호자용 보고서</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div className="font-semibold text-slate-900">{settings?.hospitalName || 'GrowthTrack Clinic'}</div>
              <div>담당의: {settings?.doctorName || '-'}</div>
              <div>{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="print-section mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <div><span className="font-semibold text-slate-900">생년월일:</span> {patient.dob}</div>
            <div><span className="font-semibold text-slate-900">만 나이:</span> {Number.isFinite(patient.chronologicalAge) ? patient.chronologicalAge.toFixed(1) : '-'}세</div>
            <div><span className="font-semibold text-slate-900">골연령:</span> {patient.boneAge || '-'}세</div>
            <div><span className="font-semibold text-slate-900">Tanner stage:</span> {patient.tannerStage || '-'}</div>
            <div><span className="font-semibold text-slate-900">목표키(MPH):</span> {patient.targetHeight?.toFixed(1)} cm</div>
            <div><span className="font-semibold text-slate-900">예측 성인키(PAH):</span> {((reportPredictedHeight ?? patient.predictedAdultHeight ?? 0) as number).toFixed(1)} cm</div>
          </div>
        </div>

        <div className="mt-6 print-allow-break">
          {loading ? (
            <p className="text-sm text-slate-500">리포트 생성 중입니다. 생성 완료 후 다시 인쇄해주세요.</p>
          ) : (
            <>
              {summaryContent && restContent ? (
                <>
                  <MarkdownRenderer content={summaryContent} />
                  <RecentGrowthSummary points={growthSeries} velocity={recentGrowthVelocity} />
                  <MarkdownRenderer content={restContent} />
                </>
              ) : (
                <>
                  <MarkdownRenderer content={reportContent} />
                  <RecentGrowthSummary points={growthSeries} velocity={recentGrowthVelocity} />
                </>
              )}
            </>
          )}
        </div>

        <div className="print-section mt-6">
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">현재 체격 요약</h3>
              <span className="text-xs text-slate-400">기준일: {latestMeasurement?.date || '기록 없음'}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="text-slate-500">현재 키</div>
                <div className="font-bold text-slate-900">{latestHeight ? latestHeight.toFixed(1) : '-'} cm</div>
                {heightPercentile !== null && (
                  <div className="text-blue-700 font-semibold mt-1">키 백분위 {heightPercentile.toFixed(1)}%</div>
                )}
              </div>
              <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="text-slate-500">현재 체중</div>
                <div className="font-bold text-slate-900">{latestWeight ? latestWeight.toFixed(1) : '-'} kg</div>
                {weightPercentile !== null && (
                  <div className="text-emerald-700 font-semibold mt-1">체중 백분위 {weightPercentile.toFixed(1)}%</div>
                )}
              </div>
              <div className="border border-blue-100 rounded-lg p-3 bg-blue-50">
                <div className="text-blue-700 font-semibold">BMI 백분위</div>
                <div className="font-bold text-blue-700">
                  {bmiPercentile !== null ? `${bmiPercentile.toFixed(1)} %` : '- %'}
                </div>
                <div className="text-blue-600 mt-1">BMI {bmiValue ? bmiValue.toFixed(1) : '-'} kg/m²</div>
              </div>
            </div>
          </div>
        </div>

        <div className="print-section mt-8 text-xs text-slate-500 border-t border-slate-200 pt-3">
          {settings?.hospitalName || 'GrowthTrack Clinic'} • {settings?.address || ''} • {settings?.phone || ''}
        </div>
      </div>
    </div>
  );
};

export default ParentReport;
