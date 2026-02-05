'use client';

import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  FileText,
  ScanLine,
  Settings as SettingsIcon,
  Menu,
  Bell,
  UserPlus,
  Search,
  User,
  ChevronLeft,
  Ruler,
  Activity,
  ClipboardList,
} from 'lucide-react';
import PatientDetail from './PatientDetail';
import PatientList from './PatientList';
import LabOCR from './LabOCR';
import ParentReport from './ParentReport';
import PatientForm from './PatientForm';
import BoneAgeReading from './BoneAgeReading';
import MeasurementInput from './MeasurementInput';
import Settings, { ClinicSettings } from './Settings';
import MedicationManager from './MedicationManager';
import Auth from './Auth';
import ClinicOnboarding from './ClinicOnboarding';
import { ClinicInfo, LabResult, Patient } from '../types';
import { api } from '../src/services/api';
import { aiService } from '../src/services/ai';
import { getGrowthStandards } from '../src/data/growthStandardsData';
import { supabase } from '../src/lib/supabase';

type View =
  | 'dashboard'
  | 'patient-detail'
  | 'ocr'
  | 'report'
  | 'settings'
  | 'patient-form'
  | 'bone-age'
  | 'measurement-input'
  | 'medication-setup';

function AppShell({ initialPatientId }: { initialPatientId?: string }) {
  /* Supabase & AI Integration */
  const [session, setSession] = useState<Session | null>(null);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [intakeLink, setIntakeLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [intakeLinkLoading, setIntakeLinkLoading] = useState(false);
  const [pendingPatientId, setPendingPatientId] = useState<string | undefined>(initialPatientId);

  // Settings State
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    hospitalName: 'GrowthTrack Clinic',
    doctorName: 'Dr. Johnson',
    address: '서울특별시 강남구 테헤란로 123',
    phone: '(02) 555-1234',
  });

  const updateSettings = async (newSettings: ClinicSettings) => {
    setClinicSettings(newSettings);
    if (!clinic?.id) return;
    try {
      await api.updateClinicSettings(clinic.id, {
        hospitalName: newSettings.hospitalName,
        doctorName: newSettings.doctorName,
        address: newSettings.address,
        phone: newSettings.phone,
      });
      await loadClinic();
    } catch (e) {
      console.error('Failed to update clinic settings', e);
      alert('클리닉 설정 저장에 실패했습니다.');
    }
  };

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string[] | null>(null);
  const [aiPredictedHeight, setAiPredictedHeight] = useState<number | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [measurements, setMeasurements] = useState<any[]>([]);
  const latestMeasurementForEdit = React.useMemo(() => {
    if (!editingPatient) return null;
    const sorted = [...measurements]
      .filter((m) => (m.height && m.height > 0) || (m.weight && m.weight > 0))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0] || null;
  }, [editingPatient, measurements]);

  // Auth/session bootstrap
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    };
    init();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setPendingPatientId(initialPatientId);
  }, [initialPatientId]);

  const loadClinic = async () => {
    if (!session) {
      setClinic(null);
      return;
    }
    setClinicLoading(true);
    try {
      const myClinic = await api.getMyClinic();
      const prevClinicId = clinic?.id || null;
      setClinic(myClinic);
      if (myClinic) {
        setClinicSettings((prev) => ({
          hospitalName: myClinic.name || prev.hospitalName,
          doctorName: myClinic.doctorName || prev.doctorName,
          address: myClinic.address || prev.address,
          phone: myClinic.phone || prev.phone,
        }));
      }
      if (!myClinic?.id) {
        setCurrentPatient(null);
        setPatients([]);
        setLabResults([]);
        setMeasurements([]);
        setGrowthData([]);
        return;
      }
      if (myClinic.id !== prevClinicId) {
        setCurrentPatient(null);
        setLabResults([]);
        setMeasurements([]);
        setGrowthData([]);
      }
      await loadData(myClinic.id);
    } catch (e) {
      console.error('Failed to load clinic', e);
      setClinic(null);
    } finally {
      setClinicLoading(false);
    }
  };

  const sessionUserId = session?.user?.id;

  useEffect(() => {
    if (!sessionUserId) {
      setClinic(null);
      setClinicLoading(false);
      return;
    }
    loadClinic();
  }, [sessionUserId]);

  useEffect(() => {
    if (!pendingPatientId) return;
    if (!session || clinicLoading || !clinic) return;

    const jumpToPatient = async () => {
      await loadPatientData(pendingPatientId);
      setCurrentView('patient-detail');
      setPendingPatientId(undefined);
    };

    jumpToPatient();
  }, [pendingPatientId, session, clinicLoading, clinic]);

  const loadData = async (clinicId: string) => {
    try {
      const patientsList = await api.getPatients(clinicId);
      setPatients(patientsList || []);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  const loadPatientData = async (patientId: string) => {
    try {
      setIntakeLink(null);
      setAiAnalysis(null);
      setAiPredictedHeight(undefined);
      const [labs, meas, meds, patientFromDb] = await Promise.all([
        api.getLabResults(patientId),
        api.getMeasurements(patientId),
        api.getMedications(patientId),
        api.getPatient(patientId),
      ]);
      const patientFromList = patients.find((p) => p.id === patientId);
      const patient = {
        ...(patientFromList || {}),
        ...(patientFromDb || {}),
        medications: meds,
      } as Patient;

      setLabResults(labs);
      setMeasurements(meas);
      setCurrentPatient(patient);

      try {
        const latestToken = await api.getLatestIntakeToken(patient.id);
        if (latestToken?.token) {
          setIntakeLink({
            url: `${window.location.origin}/intake/${latestToken.token}`,
            expiresAt: latestToken.expires_at,
          });
        }
      } catch (e) {
        console.warn('Failed to load latest intake token', e);
      }
      setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...p, ...patient } : p)));

      // 1. Process Patient Measurements
      const patientPoints = meas
        .map((m) => {
          const measureDate = new Date(m.date);
          const birthDate = new Date(patient.dob);
          const ageInMonths = (measureDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          const ageInYears = ageInMonths / 12;

          return {
            age: Number(ageInYears.toFixed(2)),
            ageInMonths: Number(ageInMonths.toFixed(1)),
            height: m.height === 0 ? undefined : m.height,
            weight: m.weight === 0 ? undefined : m.weight,
            boneAge: m.boneAge,
            isPatient: true,
            date: m.date,
          };
        })
        .filter(Boolean);

      // 2. Load Standard Data (Sync)
      const standardPoints = getGrowthStandards(patient.gender);

      // 3. Merge Data
      const combinedData = [
        ...standardPoints.map((sp) => ({
          age: sp.ageInYears,
          percentile3: sp.percentile3,
          percentile50: sp.percentile50,
          percentile97: sp.percentile97,
        })),
        ...patientPoints,
      ].sort((a: any, b: any) => a.age - b.age);

      setGrowthData(combinedData);

      try {
        const cached = await api.getAiReport(patient.id, 'dashboard');
        setAiAnalysis(cached?.analysis || null);
        setAiPredictedHeight(cached?.predictedHeight ?? undefined);
      } catch (e) {
        console.warn('Failed to load cached AI analysis', e);
        setAiAnalysis(null);
        setAiPredictedHeight(undefined);
      }
    } catch (e) {
      console.error('Failed to load patient details', e);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    setCurrentPatient(patient);
    await loadPatientData(patient.id);
    setCurrentView('patient-detail');
  };

  const handleCreateIntakeLink = async () => {
    if (!currentPatient) return;
    setIntakeLinkLoading(true);
    try {
      const token = await api.createIntakeToken(currentPatient.id);
      setIntakeLink({
        url: `${window.location.origin}/intake/${token.token}`,
        expiresAt: token.expires_at,
      });
      alert('문진 링크가 생성되었습니다.');
    } catch (e) {
      console.error('Failed to create intake link', e);
      alert('문진 링크 생성에 실패했습니다.');
    } finally {
      setIntakeLinkLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!currentPatient) return;
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzeGrowth(currentPatient, growthData, labResults);
      setAiAnalysis(result.analysis);
      if (result.predictedHeight) setAiPredictedHeight(result.predictedHeight);
      await api.upsertAiReport({
        patientId: currentPatient.id,
        kind: 'dashboard',
        analysis: result.analysis,
        predictedHeight: result.predictedHeight ?? null,
        sourceModel: 'gpt-5.2-2025-12-11',
      });
    } catch (error: any) {
      console.error('AI Analysis failed', error);
      alert(error?.message || 'AI Analysis failed. Check API Key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewLabResults = async (newResults: LabResult[]) => {
    if (currentPatient) {
      try {
        const resultsToSave = newResults.map((r) => ({
          ...r,
          patient_id: currentPatient.id,
        }));

        await api.addLabResults(resultsToSave);
        const updatedLabs = await api.getLabResults(currentPatient.id);
        setLabResults(updatedLabs);
        alert('검사 결과가 저장되었습니다.');
        setCurrentView('patient-detail');
      } catch (e) {
        console.error('Failed to save labs', e);
        alert('저장 중 오류가 발생했습니다.');
      }
    } else {
      setLabResults([...newResults, ...labResults]);
      setCurrentView('patient-detail');
    }
  };

  const handleSavePatient = async (updatedPatient: Patient) => {
    try {
      if (updatedPatient.id.startsWith('PT-')) {
        if (!clinic?.id) throw new Error('Missing clinic context');
        await api.createPatient(updatedPatient, clinic.id);
      } else {
        await api.updatePatient(updatedPatient.id, updatedPatient);
      }
      if (clinic?.id) {
        await loadData(clinic.id);
      }
      setCurrentView('dashboard');
    } catch (e) {
      console.error('Save failed', e);
      const newPatients = updatedPatient.id.startsWith('PT-')
        ? [...patients, updatedPatient]
        : patients.map((p) => (p.id === updatedPatient.id ? updatedPatient : p));
      setPatients(newPatients);
      setCurrentView('dashboard');
    }
  };

  const handleSaveBoneAge = async (boneAge: number, date: string) => {
    if (!currentPatient) return;
    try {
      const updatedPatient = { ...currentPatient, boneAge };
      await api.updatePatient(currentPatient.id, updatedPatient);
      setCurrentPatient(updatedPatient);

      await api.addMeasurement({
        patient_id: currentPatient.id,
        date,
        boneAge,
      });

      alert(`골연령 ${boneAge}세 (측정일: ${date}) 저장되었습니다.`);
      await loadPatientData(currentPatient.id);
      setCurrentView('patient-detail');
    } catch (e) {
      console.error('Failed to save bone age', e);
      alert('저장 실패');
    }
  };

  const handleSaveMeasurement = async (date: string, height: number, weight: number) => {
    if (!currentPatient) return;
    try {
      await api.addMeasurement({
        patient_id: currentPatient.id,
        date,
        height,
        weight,
      });

      alert(`신체 계측 (신장 ${height}cm, 체중 ${weight}kg) 저장되었습니다.`);

      await loadPatientData(currentPatient.id);
      setCurrentView('patient-detail');
    } catch (e) {
      console.error('Failed to save measurement', e);
      alert('저장 실패');
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setCurrentView('patient-form');
  };

  const handleSidebarClick = (view: View) => {
    if (
      (view === 'ocr' || view === 'report' || view === 'bone-age' || view === 'measurement-input') &&
      !currentPatient
    ) {
      alert('먼저 환자를 선택해주세요.\n(Please select a patient first.)');
      return;
    }
    if (view === 'patient-form') {
      setEditingPatient(undefined);
    }
    setCurrentView(view);
  };

  const SidebarItem = ({
    view,
    icon: Icon,
    label,
  }: {
    view: View;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => handleSidebarClick(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view || (view === 'dashboard' && currentView === 'patient-detail')
          ? 'bg-blue-700 text-white shadow-soft'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium tracking-tight">{label}</span>
    </button>
  );

  return (
    <>
      {authLoading && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-500">Loading...</div>
        </div>
      )}

      {!authLoading && !session && <Auth />}

      {!authLoading && session && clinicLoading && (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-500">Loading clinic...</div>
        </div>
      )}

      {!authLoading && session && !clinicLoading && !clinic && (
        <ClinicOnboarding initialClinicName={clinicSettings.hospitalName} onComplete={loadClinic} />
      )}

      {!authLoading && session && !clinicLoading && clinic && (
        <div className="relative flex min-h-screen bg-transparent font-sans app-shell">
          {/* Sidebar */}
          <aside className="w-64 bg-white/90 backdrop-blur border-r border-slate-200 hidden md:flex flex-col app-sidebar">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 text-blue-700">
                <div className="bg-blue-700 text-white p-2 rounded-xl shadow-soft">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight">{clinic?.name || clinicSettings.hospitalName}</span>
                  <p className="text-xs text-slate-400 mt-1">Pediatric Endocrinology</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <div className="mb-6">
                <button
                  onClick={() => setCurrentView('patient-form')}
                  className="w-full bg-blue-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-soft"
                >
                  <UserPlus size={18} />
                  <span className="font-medium">신규 환자 등록</span>
                </button>
              </div>
              <SidebarItem view="dashboard" icon={LayoutDashboard} label="대시보드" />
              <SidebarItem view="measurement-input" icon={Activity} label="신체 계측 (방문)" />
              <SidebarItem view="bone-age" icon={Ruler} label="골연령 판독" />
              <SidebarItem view="ocr" icon={ScanLine} label="결과지 스캔 (OCR)" />
              <SidebarItem view="report" icon={FileText} label="리포트 생성" />
              <button
                onClick={() => (window.location.href = '/intakes')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100"
              >
                <ClipboardList size={20} />
                <span className="font-medium tracking-tight">문진 대시보드</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-100">
              <SidebarItem view="settings" icon={SettingsIcon} label="설정" />
              <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                  DR
                </div>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">{clinicSettings.doctorName}</p>
                  <p className="text-slate-400 text-xs">소아내분비내과</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden app-main">
            {/* Header with Search */}
            <header className="bg-white/90 backdrop-blur border-b border-slate-200 h-16 flex items-center justify-between px-6 app-header">
              <button className="md:hidden text-slate-600">
                <Menu />
              </button>

              {/* Search Bar - Only in Detail or other views since List has its own search */}
              <div className="hidden md:flex flex-1 max-w-xl ml-4 relative">
                {currentView !== 'dashboard' && (
                  <>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="환자 이름, 등록번호 검색..."
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                    currentPatient
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                  }`}
                >
                  <User size={14} />
                  <span>현재 환자: {currentPatient ? currentPatient.name : '선택된 환자 없음'}</span>
                </div>
                <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg"
                >
                  로그아웃
                </button>
              </div>
            </header>

            {/* View Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
              {currentView === 'dashboard' && (
                <PatientList
                  patients={patients}
                  onSelectPatient={handleSelectPatient}
                  onRegisterNew={() => setCurrentView('patient-form')}
                />
              )}

              {currentView === 'patient-detail' && currentPatient && (
                <>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="mb-4 flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <ChevronLeft size={20} />
                    환자 목록으로 돌아가기
                  </button>
                  <PatientDetail
                    patient={currentPatient}
                    growthData={growthData}
                    labResults={labResults}
                    measurements={measurements}
                    aiAnalysis={aiAnalysis}
                    aiPredictedHeight={aiPredictedHeight}
                    onAnalyzeGrowth={handleAIAnalysis}
                    isAnalyzing={isAnalyzing}
                    onRefresh={() => currentPatient && loadPatientData(currentPatient.id)}
                    onManageMedication={() => setCurrentView('medication-setup')}
                    onEditPatient={() => handleEditPatient(currentPatient)}
                    intakeLink={intakeLink}
                    intakeLinkLoading={intakeLinkLoading}
                    onCreateIntakeLink={handleCreateIntakeLink}
                  />
                </>
              )}

              {currentView === 'ocr' && <LabOCR onResultsProcessed={handleNewLabResults} />}

              {currentView === 'bone-age' && currentPatient && (
                <BoneAgeReading
                  patient={currentPatient}
                  onSave={handleSaveBoneAge}
                  onCancel={() => setCurrentView('patient-detail')}
                />
              )}

              {currentView === 'measurement-input' && currentPatient && (
                <MeasurementInput
                  patient={currentPatient}
                  onSave={handleSaveMeasurement}
                  onCancel={() => setCurrentView('patient-detail')}
                />
              )}

              {currentView === 'report' && currentPatient && (
                <ParentReport
                  patient={currentPatient}
                  growthData={growthData}
                  labResults={labResults}
                  onBack={() => setCurrentView('patient-detail')}
                  settings={clinicSettings}
                  aiPredictedHeight={aiPredictedHeight}
                />
              )}

              {currentView === 'medication-setup' && currentPatient && (
                <MedicationManager
                  patient={currentPatient}
                  onSave={() => loadPatientData(currentPatient.id)}
                  onBack={() => setCurrentView('patient-detail')}
                />
              )}

              {currentView === 'patient-form' && (
                <PatientForm
                  initialData={editingPatient}
                  initialHeight={editingPatient ? latestMeasurementForEdit?.height : undefined}
                  initialWeight={editingPatient ? latestMeasurementForEdit?.weight : undefined}
                  onSave={handleSavePatient}
                  onCancel={() => setCurrentView('dashboard')}
                />
              )}

              {currentView === 'settings' && (
                <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50 rounded-2xl border border-slate-100">
                  <Settings settings={clinicSettings} onSave={updateSettings} />
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

export default AppShell;
