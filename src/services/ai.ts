export const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';

type AnalyzeResponse = {
  analysis: string[];
  predictedHeight?: number;
};

type ParentReportResponse = {
  markdownReport: string;
};

type OcrResponse = {
  collectionDate?: string | null;
  results: any[];
};

const requestAI = async <T>(path: string, payload: unknown): Promise<T> => {
  if (!aiEnabled) {
    throw new Error('AI 기능이 비활성화되어 있습니다. API 키 설정 후 이용 가능합니다.');
  }
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.error || 'AI 요청에 실패했습니다.';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const aiService = {
  async analyzeGrowth(patientData: any, measurements: any[], labResults: any[]) {
    return requestAI<AnalyzeResponse>('/api/ai/analyze', {
      patientData,
      measurements,
      labResults,
    });
  },

  async generateParentReport(patient: any, recentLabs: any[], meds: any[], reportContext?: any) {
    const data = await requestAI<ParentReportResponse>('/api/ai/report', {
      patient,
      recentLabs,
      meds,
      reportContext,
    });
    return data.markdownReport;
  },

  async extractLabResults(file: File): Promise<OcrResponse> {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });

    return requestAI<OcrResponse>('/api/ai/ocr', {
      base64: base64Data,
      mimeType: file.type,
    });
  },
};
