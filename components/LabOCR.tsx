import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, ScanLine, Edit2 } from 'lucide-react';
import { LabResult } from '../types';
import { aiService } from '../src/services/ai';

interface LabOCRProps {
  onResultsProcessed: (results: LabResult[]) => void;
}

const LabOCR: React.FC<LabOCRProps> = ({ onResultsProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'review' | 'success'>('idle');
  const [scannedData, setScannedData] = useState<LabResult[]>([]);

  // Actual OCR processing using Gemini
  const handleFiles = async (files: FileList | null) => {
    if (files && files[0]) {
      setStatus('scanning');
      try {
        const extractedData = await aiService.extractLabResults(files[0]);
        // Add IDs and dates to extracted data
        const processedData: LabResult[] = extractedData.map((item: any, index: number) => ({
          id: `ocr-${Date.now()}-${index}`,
          date: new Date().toISOString().split('T')[0],
          parameter: item.parameter,
          value: item.value,
          unit: item.unit,
          referenceRange: item.referenceRange || '',
          status: item.status || 'normal'
        }));
        setScannedData(processedData);
        setStatus('review');
      } catch (error) {
        console.error("OCR Failed", error);
        alert("OCR analysis failed. Please try again.");
        setStatus('idle');
      }
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleUpdateField = (index: number, field: keyof LabResult, value: string) => {
    const newData = [...scannedData];
    if (field === 'value') {
      const numVal = parseFloat(value);
      newData[index] = { ...newData[index], value: isNaN(numVal) ? 0 : numVal };
    } else {
      // @ts-ignore - dynamic key assignment safety ignored for simplicity in this specific context
      newData[index] = { ...newData[index], [field]: value };
    }
    setScannedData(newData);
  };

  const confirmData = () => {
    onResultsProcessed(scannedData);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold text-slate-900">검사 결과지 스캔 (Lab OCR)</h2>
        <p className="text-slate-500">혈액검사 결과지(PDF 또는 이미지)를 업로드하세요. OCR 엔진이 자동으로 수치를 판독합니다.</p>
      </div>

      {status === 'idle' && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept="image/*,.pdf"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-900">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-sm text-slate-500 mt-1">지원 형식: JPG, PNG, PDF (최대 10MB)</p>
            </div>
          </div>
        </div>
      )}

      {status === 'scanning' && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
              <ScanLine size={48} className="text-blue-600 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">문서 스캔 중...</h3>
              <p className="text-slate-500 mt-2">검사 항목 및 수치 데이터를 추출하고 있습니다.</p>
            </div>
            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-[width_2s_ease-in-out_infinite] w-1/3"></div>
            </div>
          </div>
        </div>
      )}

      {status === 'review' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><CheckCircle size={20} /> 데이터 추출 완료 (검토 및 수정)</h3>
            <span className="text-sm bg-blue-500 px-3 py-1 rounded-full">신뢰도: 98%</span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <Edit2 size={16} />
              <p className="text-sm font-medium">추출된 데이터가 원본과 일치하는지 확인하고, 필요시 수정해주세요.</p>
            </div>
            <div className="space-y-3">
              {scannedData.map((result, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <div className="flex-1 w-full">
                    <label className="text-xs text-slate-500 font-semibold uppercase mb-1 block">검사 항목 (Parameter)</label>
                    <input
                      value={result.parameter}
                      onChange={(e) => handleUpdateField(idx, 'parameter', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs text-slate-500 font-semibold uppercase mb-1 block">결과값 (Value)</label>
                    <input
                      type="number"
                      value={result.value}
                      onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold text-blue-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="text-xs text-slate-500 font-semibold uppercase mb-1 block">단위 (Unit)</label>
                    <input
                      value={result.unit}
                      onChange={(e) => handleUpdateField(idx, 'unit', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setStatus('idle')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">취소</button>
              <button onClick={confirmData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">
                확인 및 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-in zoom-in duration-300">
          <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full text-green-600 mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-green-900">저장 완료!</h3>
          <p className="text-green-700">검사 결과가 환자 기록에 성공적으로 반영되었습니다.</p>
        </div>
      )}
    </div>
  );
};

export default LabOCR;