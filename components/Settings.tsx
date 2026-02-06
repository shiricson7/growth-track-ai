'use client';

import React, { useEffect, useState } from 'react';
import { Save, Building, Phone, MapPin, User, Settings as SettingsIcon } from 'lucide-react';

export interface ClinicSettings {
    hospitalName: string;
    doctorName: string;
    address: string;
    phone: string;
}

interface SettingsProps {
    settings: ClinicSettings;
    onSave: (settings: ClinicSettings) => void;
    clinicCode?: string;
    showInvite?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, clinicCode, showInvite }) => {
    const [formData, setFormData] = useState<ClinicSettings>(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleCopy = async () => {
        if (!clinicCode) return;
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(clinicCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {showInvite && clinicCode && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-700">클리닉 코드 (멤버 초대용)</h3>
                <div className="mt-3 flex flex-col md:flex-row gap-2">
                    <input
                        value={clinicCode}
                        readOnly
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
                    />
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
                    >
                        {copied ? '복사됨' : '복사'}
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">직원/태블릿 계정은 로그인 후 클리닉 코드로 참여할 수 있습니다.</p>
            </div>
        )}
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <SettingsIcon className="text-slate-400" />
                    환경 설정 (Clinic Settings)
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <Building size={16} className="text-slate-400" /> 병원명 (Hospital Name)
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                value={formData.hospitalName}
                                onChange={e => setFormData({ ...formData, hospitalName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <User size={16} className="text-slate-400" /> 담당 의사 (Doctor Name)
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                value={formData.doctorName}
                                onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <MapPin size={16} className="text-slate-400" /> 주소 (Address)
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <Phone size={16} className="text-slate-400" /> 전화번호 (Phone)
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            type="submit"
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Save size={18} />
                            설정 저장
                        </button>
                    </div>
                </form>
                {isSaved && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center justify-center animate-in fade-in">
                        설정이 성공적으로 저장되었습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
