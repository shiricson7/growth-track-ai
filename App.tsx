
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, ScanLine, Settings, Menu, Bell, UserPlus, Search, User, ChevronLeft, Ruler, Activity } from 'lucide-react';
import PatientDetail from './components/PatientDetail';
import PatientList from './components/PatientList';
import LabOCR from './components/LabOCR';
import ParentReport from './components/ParentReport';
import PatientForm from './components/PatientForm';
import BoneAgeReading from './components/BoneAgeReading';
import MeasurementInput from './components/MeasurementInput';
import { PATIENT, GROWTH_DATA } from './mockData'; // Removed LAB_RESULTS
import { LabResult, Patient } from './types';
import { api } from './src/services/api';
import { aiService } from './src/services/ai';

type View = 'dashboard' | 'patient-detail' | 'ocr' | 'report' | 'settings' | 'patient-form' | 'bone-age' | 'measurement-input';

function App() {
  /* Supabase & AI Integration */
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [growthData, setGrowthData] = useState<any[]>(GROWTH_DATA); // Fallback to mock for graph structure if empty
  const [searchQuery, setSearchQuery] = useState('');

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [measurements, setMeasurements] = useState<any[]>([]); // New state for raw measurements

  // Load Initial Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const patientsList = await api.getPatients();
      setPatients(patientsList || []);
    } catch (e) {
      console.error("Failed to load data", e);
      // setPatients([PATIENT]); // Keep empty on error or use mock? Let's keep empty for now as per requirements.
    }
  };

  const loadPatientData = async (patientId: string) => {
    try {
      const labs = await api.getLabResults(patientId);
      const meas = await api.getMeasurements(patientId);

      setLabResults(labs);
      setMeasurements(meas);

      // Merge measurements into Growth Data
      // 1. Start with standard curve (GROWTH_DATA) but REMOVE mock 'height' values
      //    so they don't conflict with real patient data.
      const baseData = GROWTH_DATA.map(d => {
        const { height, ...rest } = d; // Strip 'height' from mock standard curves
        return rest;
      });

      // 2. Add patient measurements
      // Real implementation would calculate exact age for each measurement
      const patientData = meas.map(m => {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return null;

        const measureDate = new Date(m.date);
        const birthDate = new Date(patient.dob);
        const ageInYears = (measureDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        return {
          age: Number(ageInYears.toFixed(1)),
          height: m.height === 0 ? undefined : m.height, // Avoid plotting 0 height
          weight: m.weight === 0 ? undefined : m.weight,
          boneAge: m.boneAge,
          // Keep standard curves empty for these custom points so lines don't get messy
          // or rely on the Chart to interpolate/ignore missing keys
        };
      }).filter(Boolean);

      // Simple merge: Concat and sort by age
      const combinedData = [...baseData, ...patientData!].sort((a: any, b: any) => a.age - b.age);
      setGrowthData(combinedData);

    } catch (e) {
      console.error("Failed to load patient details", e);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    setCurrentPatient(patient);
    await loadPatientData(patient.id);
    setCurrentView('patient-detail');
  };

  const handleAIAnalysis = async () => {
    if (!currentPatient) return;
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzeGrowth(currentPatient, growthData, labResults);
      // Clean up markdown code blocks if present
      const cleanResult = result.replace(/```markdown/g, '').replace(/```/g, '');
      // Split into list items if it's a list, otherwise just array of one
      const lines = cleanResult.split('\n').filter(line => line.trim().length > 0);
      setAiAnalysis(lines);
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("AI Analysis failed. Check console and API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewLabResults = async (newResults: LabResult[]) => {
    if (currentPatient) {
      try {
        // Assign Patient ID
        const resultsToSave = newResults.map(r => ({
          ...r,
          patient_id: currentPatient.id
        }));

        await api.addLabResults(resultsToSave);
        // Reload to get IDs and confirmed state
        const updatedLabs = await api.getLabResults(currentPatient.id);
        setLabResults(updatedLabs);
        alert("검사 결과가 저장되었습니다.");
        setCurrentView('patient-detail');
      } catch (e) {
        console.error("Failed to save labs", e);
        alert("저장 중 오류가 발생했습니다.");
      }
    } else {
      // Fallback for no patient selected (shouldn't happen due to guards)
      setLabResults([...newResults, ...labResults]);
      setCurrentView('patient-detail');
    }
  };

  const handleSavePatient = async (updatedPatient: Patient) => {
    try {
      if (updatedPatient.id.startsWith('PT-')) {
        // It's a mock ID, so create new
        await api.createPatient(updatedPatient);
      } else {
        await api.updatePatient(updatedPatient.id, updatedPatient);
      }
      await loadData(); // Reload list
      setCurrentView('dashboard'); // Return to list
    } catch (e) {
      console.error("Save failed", e);
      // Fallback for demo
      const newPatients = updatedPatient.id.startsWith('PT-')
        ? [...patients, updatedPatient]
        : patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
      setPatients(newPatients);
      setCurrentView('dashboard');
    }
  };

  const handleSaveBoneAge = async (boneAge: number, date: string) => {
    if (!currentPatient) return;
    try {
      // 1. Update Patient's current Bone Age
      const updatedPatient = { ...currentPatient, boneAge };
      await api.updatePatient(currentPatient.id, updatedPatient);
      setCurrentPatient(updatedPatient);

      // 2. Create a Measurement entry
      await api.addMeasurement({
        patient_id: currentPatient.id,
        date: date,
        boneAge: boneAge
        // height/weight are optional
      });

      alert(`골연령 ${boneAge}세 (측정일: ${date}) 저장되었습니다.`);
      // Reload charts
      await loadPatientData(currentPatient.id);
      setCurrentView('patient-detail');
    } catch (e) {
      console.error("Failed to save bone age", e);
      alert("저장 실패");
    }
  };

  const handleSaveMeasurement = async (date: string, height: number, weight: number) => {
    if (!currentPatient) return;
    try {
      await api.addMeasurement({
        patient_id: currentPatient.id,
        date: date,
        height: height,
        weight: weight
      });

      alert(`신체 계측 (신장 ${height}cm, 체중 ${weight}kg) 저장되었습니다.`);

      // Reload data
      await loadPatientData(currentPatient.id);
      setCurrentView('patient-detail');
    } catch (e) {
      console.error("Failed to save measurement", e);
      alert("저장 실패");
    }
  };

  const handleSidebarClick = (view: View) => {
    if ((view === 'ocr' || view === 'report' || view === 'bone-age' || view === 'measurement-input') && !currentPatient) {
      alert("먼저 환자를 선택해주세요.\n(Please select a patient first.)");
      return;
    }
    setCurrentView(view);
  };

  const SidebarItem = ({ view, icon: Icon, label }: { view: View; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => handleSidebarClick(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === view || (view === 'dashboard' && currentView === 'patient-detail')
        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
        : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">GrowthTrack</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="mb-6">
            <button
              onClick={() => setCurrentView('patient-form')}
              className="w-full bg-slate-900 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
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
        </nav>

        <div className="p-4 border-t border-slate-100">
          <SidebarItem view="settings" icon={Settings} label="설정" />
          <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
              DR
            </div>
            <div className="text-sm">
              <p className="font-bold text-slate-900">Dr. Johnson</p>
              <p className="text-slate-400 text-xs">소아내분비내과</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Search */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6">
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
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${currentPatient ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
              <User size={14} />
              <span>현재 환자: {currentPatient ? currentPatient.name : '선택된 환자 없음'}</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
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
                onGenerateReport={() => setCurrentView('report')}
                aiAnalysis={aiAnalysis}
                onAnalyzeGrowth={handleAIAnalysis}
                isAnalyzing={isAnalyzing}
              />
            </>
          )}

          {currentView === 'ocr' && (
            <LabOCR onResultsProcessed={handleNewLabResults} />
          )}

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
              growthData={GROWTH_DATA}
              onBack={() => setCurrentView('patient-detail')}
            />
          )}

          {currentView === 'patient-form' && (
            <PatientForm
              onSave={handleSavePatient}
              onCancel={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'settings' && (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Settings size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">환경 설정</h3>
                <p>시스템 설정 메뉴 준비중입니다.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;