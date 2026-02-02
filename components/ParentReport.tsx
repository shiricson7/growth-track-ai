import React from 'react';
import { Patient, GrowthPoint, LabResult } from '../types';
import { Printer, Download, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { aiService } from '../src/services/ai';
import { ClinicSettings } from './Settings';

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
                <MarkdownRenderer content={reportContent} />
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
                  <Line type="monotone" dataKey="height" stroke="#2563eb" strokeWidth={4} dot={{ r: 6 }} name="현재 성장" />
                  <Line type="monotone" dataKey="percentile50" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} name="또래 평균" />
                  {patient.predictedAdultHeight > 0 && (
                    <Line type="monotone" dataKey="predicted" stroke="#7c3aed" strokeDasharray="3 3" strokeWidth={2} name="AI 예측" />
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
            <MarkdownRenderer content={reportContent} />
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
