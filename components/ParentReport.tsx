'use client';

import React from 'react';
import { Patient, GrowthPoint, LabResult } from '../types';
import { Printer, Download, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { aiEnabled, aiService } from '../src/services/ai';
import { ClinicSettings } from './Settings';

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
  const chart = buildGrowthPolyline(recentPoints);
  const velocityText = Number.isFinite(velocity)
    ? `최근 성장속도는 ${velocity?.toFixed(1)} cm/년 입니다.`
    : '최근 성장속도는 데이터가 부족해 계산할 수 없습니다.';

  return (
    <div className="mt-6 border border-slate-200 rounded-lg bg-white p-4">
      <div className="text-sm font-semibold text-slate-800 mb-2">최근 성장 추이</div>
      {recentPoints.length < 2 ? (
        <p className="text-sm text-slate-500">최근 성장 데이터가 충분하지 않습니다.</p>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <svg
              width="100%"
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              className="h-24 w-full"
            >
              <rect x="0" y="0" width={chart.width} height={chart.height} fill="#f8fafc" rx="8" />
              <polyline
                fill="none"
                stroke={REPORT_COLORS.patient}
                strokeWidth="2.5"
                points={chart.polyline}
              />
              {chart.dots.map((dot, idx) => (
                <circle key={idx} cx={dot.cx} cy={dot.cy} r="3" fill={REPORT_COLORS.patient} />
              ))}
            </svg>
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
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [reportPredictedHeight, setReportPredictedHeight] = React.useState<number | undefined>(aiPredictedHeight);
  const { summaryContent, restContent } = React.useMemo(() => splitReportContent(reportContent), [reportContent]);
  const growthSeries = React.useMemo(() => {
    return (growthData || [])
      .filter((p) => Number.isFinite(p.age) && Number.isFinite(p.height))
      .sort((a, b) => a.age - b.age);
  }, [growthData]);
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
    if (!isPrinting) return;
    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => window.print());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isPrinting]);

  React.useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        if (!aiEnabled) {
          setReportContent('# AI 비활성화\n\n관리자에게 API 키 설정을 요청해주세요.');
          setLoading(false);
          return;
        }
        const report = await aiService.generateParentReport(patient, labResults, patient.medications);
        setReportContent(report);
      } catch (e) {
        setReportContent("# 리포트 생성 실패\n\n죄송합니다. AI 서비스 연결에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [patient.id]);

  React.useEffect(() => {
    if (Number.isFinite(aiPredictedHeight)) {
      setReportPredictedHeight(aiPredictedHeight);
    }
  }, [aiPredictedHeight]);

  React.useEffect(() => {
    if (Number.isFinite(reportPredictedHeight)) return;
    if (!aiEnabled) return;
    const fetchPredictedHeight = async () => {
      try {
        const result = await aiService.analyzeGrowth(patient, growthData, labResults);
        if (Number.isFinite(result.predictedHeight)) {
          setReportPredictedHeight(result.predictedHeight);
        }
      } catch (e) {
        // Silent fallback to avoid blocking report generation
      }
    };
    fetchPredictedHeight();
  }, [reportPredictedHeight, patient.id, growthData, labResults]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 print-report-container">
      <div className="screen-only space-y-8">
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 print-hidden">
          <button onClick={onBack} className="text-slate-600 hover:text-slate-900 font-medium">← 대시보드로 돌아가기</button>
          <div className="flex gap-3">
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
            ) : (
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
            )}
          </div>

          {/* Simplified Chart */}
          <div className="mb-10 print-section">
            <h2 className="text-xl font-bold text-slate-800 mb-4">성장 추이 (Growth Trajectory)</h2>
            <div className="h-[300px] w-full bg-white border border-slate-100 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="age" unit="세" stroke="#94a3b8" />
                  <YAxis domain={['auto', 'auto']} unit="cm" stroke="#94a3b8" />
                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke={REPORT_COLORS.patient}
                    strokeWidth={4}
                    dot={{ r: 6 }}
                    name="현재 성장"
                  />
                  <Line
                    type="monotone"
                    dataKey="percentile50"
                    stroke={REPORT_COLORS.median}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name="또래 평균"
                  />
                  {patient.predictedAdultHeight > 0 && (
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke={REPORT_COLORS.predicted}
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      name="AI 예측"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-slate-500 mt-2 text-center italic">파란색 실선은 자녀분의 성장 곡선이며, 회색 점선은 같은 나이 또래의 평균 키입니다.</p>
          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm print-section">
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

        <div className="print-section mt-8 text-xs text-slate-500 border-t border-slate-200 pt-3">
          {settings?.hospitalName || 'GrowthTrack Clinic'} • {settings?.address || ''} • {settings?.phone || ''}
        </div>
      </div>
    </div>
  );
};

export default ParentReport;
