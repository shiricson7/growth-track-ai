import React, { useState } from 'react';
import { Patient } from '../types';
import { User, Calendar, ChevronRight, Search, Activity, UserPlus } from 'lucide-react';

interface PatientListProps {
    patients: Patient[];
    onSelectPatient: (patient: Patient) => void;
    onRegisterNew: () => void;
}

const ITEMS_PER_PAGE = 15;

const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient, onRegisterNew }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter logic
    const filteredPatients = patients.filter(p =>
        p.name.includes(searchTerm) ||
        p.chartNumber?.includes(searchTerm) ||
        p.id.includes(searchTerm)
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPatients = filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Empty State
    if (patients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500 p-8">
                <button
                    onClick={onRegisterNew}
                    className="relative group cursor-pointer transition-transform hover:scale-105 focus:outline-none"
                >
                    <img
                        src="/empty_placeholder.jpeg"
                        alt="No patients found - Click to register"
                        className="max-w-md w-full rounded-2xl shadow-xl border-4 border-white object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-2xl">
                        <div className="bg-white/90 px-6 py-3 rounded-full font-bold text-slate-900 shadow-lg flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-600" />
                            신규 환자 등록하기
                        </div>
                    </div>
                </button>
                <p className="mt-6 text-slate-500 text-lg font-medium">등록된 환자가 없습니다.</p>
                <p className="text-slate-400 text-sm">이미지를 클릭하여 첫 번째 환자를 등록하세요.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* List Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">환자 리스트</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{patients.length}명</span>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="이름, 차트번호 검색..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                    />
                </div>
            </div>

            {/* Patient Grid/List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">차트 번호</th>
                                <th className="px-6 py-3">성명</th>
                                <th className="px-6 py-3">생년월일 (나이)</th>
                                <th className="px-6 py-3">성별</th>
                                <th className="px-6 py-3">최근 방문일</th>
                                <th className="px-6 py-3 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentPatients.length > 0 ? (
                                currentPatients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => onSelectPatient(patient)}
                                    >
                                        <td className="px-6 py-4 font-mono text-slate-600">{patient.chartNumber || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                                {patient.name[0]}
                                            </div>
                                            {patient.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-slate-400" />
                                                {patient.dob} <span className="text-slate-400">({Number.isFinite(patient.chronologicalAge) ? patient.chronologicalAge.toFixed(1) : '-'}세)</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${patient.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                                }`}>
                                                {patient.gender === 'Male' ? '남성' : '여성'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            - {/* TODO: Add last visit date */}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-blue-600">
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredPatients.length)} of {filteredPatients.length} entries
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                            >
                                이전
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1 text-sm border rounded-md transition-colors ${currentPage === page
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientList;
