'use client';

import React, { useState } from 'react';
import { Save, Calendar, Activity, X } from 'lucide-react';
import { Patient } from '../types';

interface BoneAgeReadingProps {
    patient: Patient;
    onSave: (boneAge: number, date: string) => void;
    onCancel: () => void;
}

const BoneAgeReading: React.FC<BoneAgeReadingProps> = ({ patient, onSave, onCancel }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [boneAge, setBoneAge] = useState<string>(patient.boneAge > 0 ? patient.boneAge.toString() : '');
    const [method, setMethod] = useState('GP'); // GP or TW3

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(parseFloat(boneAge), date);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">골연령 판독 (Bone Age Reading)</h2>
                    <p className="text-slate-400 text-sm">환자: {patient.name} ({patient.gender === 'Male' ? '남' : '여'}, {Number.isFinite(patient.chronologicalAge) ? patient.chronologicalAge.toFixed(1) : '-'}세)</p>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">골연령 측정일 (Measurement Date)</label>
                    <div className="relative">
                        <input
                            type="date"
                            required
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-10"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                        <Calendar size={18} className="absolute left-3 top-2.5 text-slate-400" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">판독 결과 (Bone Age Result)</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                step="0.1"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pr-12 text-lg font-bold"
                                value={boneAge}
                                onChange={e => setBoneAge(e.target.value)}
                                placeholder="0.0"
                            />
                            <span className="absolute right-3 top-3 text-slate-400 font-bold">세</span>
                        </div>
                        <div className="w-1/3">
                            <select
                                value={method}
                                onChange={e => setMethod(e.target.value)}
                                className="w-full h-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="GP">Greulich-Pyle</option>
                                <option value="TW3">TW3</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        * GP: Greulich-Pyle Atlas Method / TW3: Tanner-Whitehouse 3 Method
                    </p>
                </div>

                <MonthReferenceTable />

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
                    >
                        <Save size={18} />
                        저장하기
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BoneAgeReading;

const MonthReferenceTable = () => (
    <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">개월 수 → 연령 환산표 (Months to Decimals)</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-xs text-center">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="py-2 px-2 border-r border-slate-100">개월 (Mon)</th>
                        <th className="py-2 px-2 border-r border-slate-100">계산식</th>
                        <th className="py-2 px-2 border-r border-slate-100">소수점 (2자리)</th>
                        <th className="py-2 px-2">소수점 (1자리)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                    {[
                        { m: 1, c: '1÷12', d2: '.08세', d1: '.1세' },
                        { m: 2, c: '2÷12', d2: '.17세', d1: '.2세' },
                        { m: 3, c: '3÷12', d2: '.25세', d1: '.3세' },
                        { m: 4, c: '4÷12', d2: '.33세', d1: '.3세' },
                        { m: 5, c: '5÷12', d2: '.42세', d1: '.4세' },
                        { m: 6, c: '6÷12', d2: '.50세', d1: '.5세' },
                        { m: 7, c: '7÷12', d2: '.58세', d1: '.6세' },
                        { m: 8, c: '8÷12', d2: '.67세', d1: '.7세' },
                        { m: 9, c: '9÷12', d2: '.75세', d1: '.8세' },
                        { m: 10, c: '10÷12', d2: '.83세', d1: '.8세' },
                        { m: 11, c: '11÷12', d2: '.92세', d1: '.9세' },
                    ].map((row) => (
                        <tr key={row.m} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 border-r border-slate-100 font-medium">{row.m}개월</td>
                            <td className="py-1.5 px-2 border-r border-slate-100 text-slate-400">{row.c}</td>
                            <td className="py-1.5 px-2 border-r border-slate-100">{row.d2}</td>
                            <td className="py-1.5 px-2 font-bold text-slate-800">{row.d1}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
