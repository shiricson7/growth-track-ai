'use client';

import React, { useState } from 'react';
import { X, Calendar, Activity, Edit2, Save, Trash2 } from 'lucide-react';
import { Measurement, Patient } from '../types';
import { api } from '../src/services/api';

interface BoneAgeHistoryProps {
    patient: Patient;
    measurements: Measurement[];
    onClose: () => void;
    onUpdate: () => void; // Refresh parent data
}

const BoneAgeHistory: React.FC<BoneAgeHistoryProps> = ({ patient, measurements, onClose, onUpdate }) => {
    // Filter only measurements with bone age
    const boneAgeRecords = measurements
        .filter(m => Number(m.boneAge) > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [editDate, setEditDate] = useState<string>('');

    const startEditing = (record: Measurement) => {
        setEditingId(record.id);
        setEditValue(record.boneAge?.toString() || '');
        setEditDate(record.date);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
        setEditDate('');
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await api.updateMeasurement(editingId, {
                boneAge: parseFloat(editValue),
                date: editDate
            });
            onUpdate();
            cancelEditing();
        } catch (e) {
            console.error("Failed to update bone age", e);
            alert("수정 실패");
        }
    };

    const calculateAge = (date: string) => {
        const birth = new Date(patient.dob);
        const measure = new Date(date);
        const age = (measure.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age.toFixed(1);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="text-blue-400" />
                        골연령 측정 기록 (Bone Age History)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {boneAgeRecords.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            기록된 골연령 데이터가 없습니다.
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">측정일자</th>
                                    <th className="px-4 py-3">역연령 (Chronological)</th>
                                    <th className="px-4 py-3">골연령 (Bone Age)</th>
                                    <th className="px-4 py-3">차이 (Gap)</th>
                                    <th className="px-4 py-3 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {boneAgeRecords.map(record => {
                                    const isEditing = editingId === record.id;
                                    const ca = parseFloat(calculateAge(record.date));
                                    const ba = parseFloat(record.boneAge?.toString() || '0');
                                    const gapValue = Number((ba - ca).toFixed(1));
                                    const gapColor = gapValue > 1 ? 'text-red-500' : (gapValue < -1 ? 'text-blue-500' : 'text-slate-600');

                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editDate}
                                                        onChange={e => setEditDate(e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    record.date
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{ca}세</td>
                                            <td className="px-4 py-3 font-bold text-slate-900">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="border rounded px-2 py-1 w-20"
                                                        />
                                                        <span>세</span>
                                                    </div>
                                                ) : (
                                                    `${ba}세`
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 font-medium ${gapColor}`}>
                                                {gapValue > 0 ? `+${gapValue}` : gapValue}세
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                            <Save size={16} />
                                                        </button>
                                                        <button onClick={cancelEditing} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEditing(record)} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <p>골연령이 실제 나이보다 빠를수록(+Gap) 성조숙증 가능성이 높습니다.</p>
                </div>
            </div>
        </div>
    );
};

export default BoneAgeHistory;
