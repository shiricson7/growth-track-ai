'use client';

import React, { useState } from 'react';
import { Save, X, Calendar, Ruler, Weight } from 'lucide-react';
import { Patient } from '../types';

interface MeasurementInputProps {
    patient: Patient;
    onSave: (date: string, height: number, weight: number) => void;
    onCancel: () => void;
}

const MeasurementInput: React.FC<MeasurementInputProps> = ({ patient, onSave, onCancel }) => {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [height, setHeight] = useState<string>('');
    const [weight, setWeight] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !height || !weight) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        // Validate ranges
        const h = parseFloat(height);
        const w = parseFloat(weight);

        if (h < 30 || h > 220) {
            alert('신장은 30cm ~ 220cm 사이여야 합니다.');
            return;
        }
        if (w < 1 || w > 200) {
            alert('체중은 1kg ~ 200kg 사이여야 합니다.');
            return;
        }

        onSave(date, h, w);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Ruler size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">신체 계측 입력 (Physical Measurement)</h1>
                        <p className="text-sm text-slate-500">환자: {patient.name} ({patient.gender === 'Male' ? '남' : '여'}, 만 {Number.isFinite(patient.chronologicalAge) ? patient.chronologicalAge.toFixed(1) : '-'}세)</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                측정일 (Date)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Calendar size={18} />
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    신장 (Height)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Ruler size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="30"
                                        max="220"
                                        required
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder="cm"
                                        className="block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                                        cm
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    체중 (Weight)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Weight size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="200"
                                        required
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="kg"
                                        className="block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                                        kg
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <X size={18} />
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Save size={18} />
                            저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeasurementInput;
