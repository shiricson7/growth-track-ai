'use client';

import React from 'react';
import Chart from 'chart.js/auto';
import { Patient, GrowthPoint, LabResult } from '../types';
import { Printer, Download, Star } from 'lucide-react';
import { aiEnabled, aiService } from '../src/services/ai';
import { growthStandards } from '../src/utils/growthStandards';
import { bmiStandards } from '../src/utils/bmiStandards';
import { weightStandards } from '../src/utils/weightStandards';
import { ClinicSettings } from './Settings';
import { api } from '../src/services/api';

type ChartMetric = 'height' | 'weight';

type LmsRow = {
  ageMonths: number;
  L: number;
  M: number;
  S: number;
};

type XYPoint = { x: number; y: number };

const inverseStandardNormal = (p: number): number => {
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;

  let q: number;
  let r: number;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  q = p - 0.5;
  r = q * q;
  return (
    (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
};

const lmsToValue = (row: LmsRow, z: number): number | null => {
  const { L, M, S } = row;
  if (!Number.isFinite(L) || !Number.isFinite(M) || !Number.isFinite(S)) return null;

  if (Math.abs(L) < 1e-8) {
    const value = M * Math.exp(S * z);
    return Number.isFinite(value) ? value : null;
  }

  const inner = 1 + L * S * z;
  if (inner <= 0) return null;
  const value = M * Math.pow(inner, 1 / L);
  return Number.isFinite(value) ? value : null;
};

const parseLmsCsv = (csvText: string, genderCode: '1' | '2'): LmsRow[] => {
  const lines = csvText.split(/\r?\n/).slice(2);
  const rows: LmsRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cols = trimmed.split(',').map((c) => c.trim());
    if (cols.length < 6) continue;
    if (cols[0] !== genderCode) continue;

    const ageMonths = Number.parseInt(cols[2], 10);
    const L = Number.parseFloat(cols[3]);
    const M = Number.parseFloat(cols[4]);
    const S = Number.parseFloat(cols[5]);

    if (!Number.isFinite(ageMonths) || !Number.isFinite(L) || !Number.isFinite(M) || !Number.isFinite(S)) {
      continue;
    }

    rows.push({ ageMonths, L, M, S });
  }

  return rows.sort((a, b) => a.ageMonths - b.ageMonths);
};

const metricConfig = {
  height: {
    file: '/height_chart_LMS.csv',
    unit: 'cm',
    yLabel: '키 (cm)',
    patientLabel: '환아 키',
  },
  weight: {
    file: '/weight_chart_LMS.csv',
    unit: 'kg',
    yLabel: '몸무게 (kg)',
    patientLabel: '환아 몸무게',
  },
} as const;

const LmsChart: React.FC<{
  title: string;
  metric: ChartMetric;
  gender: Patient['gender'];
  growthData: GrowthPoint[];
}> = ({ title, metric, gender, growthData }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [lmsRows, setLmsRows] = React.useState<LmsRow[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const patientSeries = React.useMemo(() => {
    const hasPatientFlag = (growthData || []).some((p: any) => typeof p?.isPatient === 'boolean');
    const patientRows = (growthData || []).filter((p: any) => {
      if (hasPatientFlag && !p?.isPatient) return false;
      if (!Number.isFinite(p?.age)) return false;
      if (metric === 'height') return Number.isFinite(p?.height) && p.height > 0;
      return Number.isFinite(p?.weight) && p.weight > 0;
    });

    return patientRows
      .map((p: any) => ({
        x: Number(p.age),
        y: metric === 'height' ? Number(p.height) : Number(p.weight),
      }))
      .filter((p: XYPoint) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a: XYPoint, b: XYPoint) => a.x - b.x);
  }, [growthData, metric]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadError(null);
        const targetGender: '1' | '2' = String(gender).toLowerCase().startsWith('m') ? '1' : '2';
        const response = await fetch(metricConfig[metric].file);
        if (!response.ok) throw new Error('CSV 로드 실패');
        const text = await response.text();
        const parsed = parseLmsCsv(text, targetGender);
        if (!cancelled) setLmsRows(parsed);
      } catch {
        if (!cancelled) {
          setLmsRows([]);
          setLoadError('기준 LMS 데이터를 불러오지 못했습니다.');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [gender, metric]);

  React.useEffect(() => {
    if (!canvasRef.current || lmsRows.length === 0) return;

    const percentiles = [0.03, 0.5, 0.97];
    const percentileDatasets = percentiles.map((p) => {
      const z = inverseStandardNormal(p);
      const data = lmsRows
        .map((row) => {
          const y = lmsToValue(row, z);
          if (!Number.isFinite(y)) return null;
          return { x: row.ageMonths / 12, y: y as number };
        })
        .filter((v): v is XYPoint => v !== null);

      return {
        label: `P${Math.round(p * 100)}`,
        data,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        tension: 0.2,
      };
    });

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: [
          ...percentileDatasets,
          {
            label: metricConfig[metric].patientLabel,
            data: patientSeries,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 4,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: '나이 (세)',
            },
          },
          y: {
            title: {
              display: true,
              text: metricConfig[metric].yLabel,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: title,
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [lmsRows, metric, patientSeries, title]);

  if (loadError) {
    return <div className="h-full flex items-center justify-center text-slate-500">{loadError}</div>;
  }

  if (lmsRows.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500">차트 데이터를 준비하고 있습니다...</div>;
  }

  return (
    <div className="h-full w-full">
      <canvas ref={canvasRef} />
    </div>
  );
};

// Simple Markdown Renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  const sections = content.split(/\n(?=# )/g);

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

        const parsedBody = body.split('\n').map((line, i) => {
          if (line.trim().length === 0) return <br key={i} />;
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

  const predictedHeightValue = React.useMemo(() => {
    const candidate = Number.isFinite(reportPredictedHeight)
      ? reportPredictedHeight
      : patient.predictedAdultHeight;
    if (!Number.isFinite(candidate) || (candidate as number) <= 0) return null;
    return candidate as number;
  }, [reportPredictedHeight, patient.predictedAdultHeight]);

  const patientMeasurements = React.useMemo(() => {
    const hasPatientFlag = (growthData || []).some((p: any) => typeof p?.isPatient === 'boolean');
    return (growthData || []).filter((p: any) => {
      if (hasPatientFlag && !p?.isPatient) return false;
      const heightOk = typeof p?.height === 'number' && p.height > 0;
      const weightOk = typeof p?.weight === 'number' && p.weight > 0;
      return heightOk || weightOk;
    });
  }, [growthData]);

  const patientHeightMeasurements = React.useMemo(() => {
    return patientMeasurements.filter((p: any) => typeof p?.height === 'number' && p.height > 0);
  }, [patientMeasurements]);

  const isFirstVisit = patientMeasurements.length <= 1;

  const latestMeasurement = React.useMemo(() => {
    if (patientMeasurements.length === 0) return null;
    return [...patientMeasurements].sort((a: any, b: any) => {
      if (a?.date && b?.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
      return (b?.age ?? 0) - (a?.age ?? 0);
    })[0];
  }, [patientMeasurements]);

  const latestHeight = typeof latestMeasurement?.height === 'number' ? latestMeasurement.height : null;
  const latestWeight = typeof latestMeasurement?.weight === 'number' ? latestMeasurement.weight : null;
  const latestAge = typeof latestMeasurement?.age === 'number' ? latestMeasurement.age : null;

  const bmiValue = latestHeight && latestWeight ? latestWeight / Math.pow(latestHeight / 100, 2) : null;

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

  const patientGrowthVelocity = React.useMemo(() => {
    if (patientHeightMeasurements.length < 2) return null;
    const sorted = [...patientHeightMeasurements].sort((a: any, b: any) => (a.age ?? 0) - (b.age ?? 0));
    const windowSize = sorted.length >= 4 ? 4 : Math.min(3, sorted.length);
    const windowPoints = sorted.slice(-windowSize);
    const first = windowPoints[0];
    const last = windowPoints[windowPoints.length - 1];
    const ageDiff = (last.age ?? 0) - (first.age ?? 0);
    if (ageDiff <= 0) return null;
    return (last.height - first.height) / ageDiff;
  }, [patientHeightMeasurements]);

  const reportContext = React.useMemo(() => {
    return {
      firstVisit: isFirstVisit,
      currentHeight: latestHeight,
      currentWeight: latestWeight,
      bmi: bmiValue,
      heightPercentile,
      weightPercentile,
      bmiPercentile,
      growthVelocity: patientGrowthVelocity,
      priorGrowthRecordCount: Math.max(0, patientMeasurements.length - 1),
      hasPriorGrowthRecords: patientMeasurements.length > 1,
    };
  }, [
    isFirstVisit,
    latestHeight,
    latestWeight,
    bmiValue,
    heightPercentile,
    weightPercentile,
    bmiPercentile,
    patientGrowthVelocity,
    patientMeasurements.length,
  ]);

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
      } catch {
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
      const report = await aiService.generateParentReport(patient, labResults, patient.medications, reportContext);
      setReportContent(report);
      setLastUpdated(new Date().toISOString());
      await api.upsertAiReport({
        patientId: patient.id,
        kind: 'parent_report',
        markdownReport: report,
        sourceModel: 'gpt-5.2-2025-12-11',
      });
    } catch {
      setReportContent('# 리포트 생성 실패\n\n죄송합니다. AI 서비스 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 print-report-container">
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

      <section className="bg-white p-12 rounded-none shadow-lg min-h-[980px] print-report print-section">
        <div className="border-b-4 border-blue-600 pb-8 mb-8 flex justify-between items-start">
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

        <div className="mb-10 min-h-[320px] print-allow-break">
          <h2 className="text-xl font-bold text-slate-800 mb-4">보호자용 설명</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-slate-500">AI가 환자의 데이터를 분석하여 리포트를 작성 중입니다...</p>
              <p className="text-xs text-slate-400">약 5-10초 정도 소요됩니다.</p>
            </div>
          ) : reportContent ? (
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 print-allow-break">
              <MarkdownRenderer content={reportContent} />
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 text-slate-500">
              저장된 AI 리포트가 없습니다. 상단의 "AI 리포트 새로 생성" 버튼을 눌러 생성해주세요.
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">현재 체격 요약</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800">측정 요약</h3>
              <span className="text-xs text-slate-400">
                기준일: {latestMeasurement?.date || '기록 없음'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="text-xs text-slate-500 mb-1">예측 키</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {predictedHeightValue ? predictedHeightValue.toFixed(1) : '-'}
                  </span>
                  <span className="text-sm text-slate-500">cm</span>
                </div>
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
      </section>

      <section
        className="bg-white p-12 rounded-none shadow-lg min-h-[980px] print-report print-section flex flex-col"
        style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
      >
        <h2 className="text-3xl font-bold text-slate-900 mb-6">{patient.name}의 키성장 그래프</h2>
        <div className="flex-1 border border-slate-200 rounded-2xl p-4 min-h-[760px]">
          <LmsChart
            title={`${patient.name}의 키성장 그래프`}
            metric="height"
            gender={patient.gender}
            growthData={growthData}
          />
        </div>
      </section>

      <section
        className="bg-white p-12 rounded-none shadow-lg min-h-[980px] print-report print-section flex flex-col"
        style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
      >
        <h2 className="text-3xl font-bold text-slate-900 mb-6">{patient.name}의 몸무게 그래프</h2>
        <div className="flex-1 border border-slate-200 rounded-2xl p-4 min-h-[720px]">
          <LmsChart
            title={`${patient.name}의 몸무게 그래프`}
            metric="weight"
            gender={patient.gender}
            growthData={growthData}
          />
        </div>

        <div className="mt-8 text-sm text-slate-500 border-t border-slate-200 pt-3 text-center">
          {settings?.hospitalName || 'GrowthTrack Clinic'} • {settings?.address || ''} • {settings?.phone || ''}
        </div>
      </section>
    </div>
  );
};

export default ParentReport;
