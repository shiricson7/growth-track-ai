import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, ScanLine, Settings, Menu, Bell, UserPlus, Search, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LabOCR from './components/LabOCR';
import ParentReport from './components/ParentReport';
import PatientForm from './components/PatientForm';
import { PATIENT, GROWTH_DATA, LAB_RESULTS } from './mockData';
import { LabResult, Patient } from './types';
import { api } from './src/services/api';
import { aiService } from './src/services/ai';

type View = 'dashboard' | 'ocr' | 'report' | 'settings' | 'patient-form';

function App() {
  /* Supabase & AI Integration */
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [growthData, setGrowthData] = useState<any[]>(GROWTH_DATA); // Fallback to mock for graph structure if empty
  const [searchQuery, setSearchQuery] = useState('');

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const patients = await api.getPatients();
      if (patients && patients.length > 0) {
        setCurrentPatient(patients[0]);
        // Load related data
        const labs = await api.getLabResults(patients[0].id);
        const measurements = await api.getMeasurements(patients[0].id);
        setLabResults(labs);
        // Transform measurements for chart if needed, for now keeping mock structure
      } else {
        // Fallback to mock if DB empty
        setCurrentPatient(PATIENT);
        setLabResults(LAB_RESULTS);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      setCurrentPatient(PATIENT);
    }
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
    // In real app, save to DB here
    if (currentPatient) {
      // await api.addLabResults(...)
    }
    setLabResults([...newResults, ...labResults]);
    setCurrentView('dashboard');
  };

  const handleSavePatient = async (updatedPatient: Patient) => {
    try {
      if (updatedPatient.id.startsWith('PT-')) {
        // It's a mock ID, so create new
        await api.createPatient(updatedPatient);
      } else {
        await api.updatePatient(updatedPatient.id, updatedPatient);
      }
      await loadData(); // Reload
      setCurrentView('dashboard');
    } catch (e) {
      console.error("Save failed", e);
      // Fallback for demo
      setCurrentPatient(updatedPatient);
      setCurrentView('dashboard');
    }
  };

  const SidebarItem = ({ view, icon: Icon, label }: { view: View; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === view
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

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl ml-4 relative">
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
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              <User size={14} />
              <span>현재 환자: {currentPatient.name}</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
          {currentView === 'dashboard' && currentPatient && (
            <Dashboard
              patient={currentPatient}
              growthData={growthData}
              labResults={labResults}
              onGenerateReport={() => setCurrentView('report')}
              aiAnalysis={aiAnalysis}
              onAnalyzeGrowth={handleAIAnalysis}
              isAnalyzing={isAnalyzing}
            />
          )}

          {currentView === 'ocr' && (
            <LabOCR onResultsProcessed={handleNewLabResults} />
          )}

          {currentView === 'report' && (
            <ParentReport
              patient={currentPatient}
              growthData={GROWTH_DATA}
              onBack={() => setCurrentView('dashboard')}
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