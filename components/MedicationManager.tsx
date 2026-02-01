import React, { useState } from 'react';
import { Syringe, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Patient, Medication } from '../types';
import { api } from '../src/services/api';

interface MedicationManagerProps {
    patient: Patient;
    onSave: () => void; // Trigger reload
    onBack: () => void;
}

const MedicationManager: React.FC<MedicationManagerProps> = ({ patient, onSave, onBack }) => {
    const [medications, setMedications] = useState<Medication[]>(patient.medications || []);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMed, setNewMed] = useState<Partial<Medication>>({
        type: 'GH',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSave = async () => {
        if (!newMed.name || !newMed.dosage || !newMed.frequency) {
            alert("모든 필수 항목을 입력해주세요.");
            return;
        }

        try {
            if (editingId) {
                await api.updateMedication(editingId, newMed);
                alert("처방 정보가 수정되었습니다.");
            } else {
                await api.addMedication(patient.id, newMed);
                alert("투약 정보가 추가되었습니다.");
            }
            onSave(); // Reload parent data
            resetForm();
        } catch (e) {
            console.error(e);
            alert("저장 실패");
        }
    };

    const handleEdit = (med: Medication) => {
        if (!med.id) return;
        setEditingId(med.id);
        setNewMed({ ...med });
        // Scroll to form if needed
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까? (삭제 후 복구 불가)")) return;
        try {
            await api.deleteMedication(id);
            alert("삭제되었습니다.");
            onSave();
            // Optimistic update
            setMedications(medications.filter(m => m.id !== id));
        } catch (e) {
            console.error(e);
            alert("삭제 실패");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setNewMed({
            type: 'GH',
            status: 'active',
            startDate: new Date().toISOString().split('T')[0],
            name: '',
            dosage: '',
            frequency: ''
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">투약 프로토콜 관리 (Medication Protocol)</h1>
            </div>

            {/* Add New Medication */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-800">
                    <Plus size={20} className="text-blue-600" /> {editingId ? '처방 수정' : '신규 처방 추가'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">약물 유형 (Type)</label>
                        <select
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            value={newMed.type}
                            onChange={e => setNewMed({ ...newMed, type: e.target.value as 'GH' | 'GnRH' })}
                        >
                            <option value="GH">성장호르몬 (GH)</option>
                            <option value="GnRH">성조숙증 치료제 (GnRH Agonist)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">약물명 (Product Name)</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            placeholder="예: 지노트로핀, 루프린"
                            value={newMed.name || ''}
                            onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">용량 (Dosage)</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            placeholder="예: 0.8mg/day, 3.75mg/month"
                            value={newMed.dosage || ''}
                            onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">빈도 (Frequency)</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            placeholder="예: 매일, 4주 간격"
                            value={newMed.frequency || ''}
                            onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">시작일 (Start Date)</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            value={newMed.startDate}
                            onChange={e => setNewMed({ ...newMed, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">상태 (Status)</label>
                        <select
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                            value={newMed.status}
                            onChange={e => setNewMed({ ...newMed, status: e.target.value as any })}
                        >
                            <option value="active">진행 중 (Active)</option>
                            <option value="completed">종료 (Completed)</option>
                            <option value="paused">중단 (Paused)</option>
                        </select>
                    </div>

                    {(newMed.status === 'completed' || newMed.status === 'paused') && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">종료일 (End Date)</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500"
                                value={newMed.endDate || newMed.startDate}
                                onChange={e => setNewMed({ ...newMed, endDate: e.target.value })}
                            />
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    {editingId && (
                        <button
                            onClick={resetForm}
                            className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                        >
                            취소
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <Save size={18} />
                        {editingId ? '수정 저장' : '처방 저장'}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Syringe className="text-green-600" /> 처방 이력
                    </h2>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">유형</th>
                            <th className="px-6 py-3">약물명</th>
                            <th className="px-6 py-3">용량/빈도</th>
                            <th className="px-6 py-3">기간</th>
                            <th className="px-6 py-3">상태</th>
                            <th className="px-6 py-3">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {medications.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">등록된 투약 정보가 없습니다.</td></tr>
                        ) : (
                            medications.map((m, idx) => (
                                <tr key={idx} className={`hover:bg-slate-50 ${editingId === m.id ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.type === 'GH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {m.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{m.dosage} <span className="text-slate-400">/ {m.frequency}</span></td>
                                    <td className="px-6 py-4 text-slate-500">{m.startDate} ~ {m.endDate || '현재'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {m.status === 'active' ? '진행 중' : '종료됨'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(m)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => m.id && handleDelete(m.id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MedicationManager;
