import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export const aiService = {
    async analyzeGrowth(patientData: any, measurements: any[], labResults: any[]) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Fast model for data analysis

            const prompt = `
        You are an expert pediatric endocrinologist. Analyze the following patient data and provide a clinical assessment.
        
        Patient: ${JSON.stringify(patientData)}
        Measurements (Chronological): ${JSON.stringify(measurements)}
        Lab Results: ${JSON.stringify(labResults)}

        Please provide:
        1. Growth Pattern Analysis (Height velocity, BMI trend)
        2. Pubertal Status Assessment (based on bone age and lab results if available)
        3. Predicted Adult Height (PAH) in cm. Calculate based on current height, bone age, and mid-parental height if available.
        4. Recommendations for further testing or monitoring
        5. A brief summary for the parent (friendly language)

        Format the output as a valid JSON object with this structure:
        {
          "analysis": ["point 1 textual analysis...", "point 2...", "summary..."],
          "predictedHeight": number (e.g. 175.5)
        }
        Do not include markdown code blocks. Just the raw JSON.
        IMPORTANT: All textual analysis, summary, and recommendations MUST be in KOREAN language (한국어).
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Clean up code blocks if present just in case
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            return {
                analysis: data.analysis as string[],
                predictedHeight: data.predictedHeight as number | undefined
            };
        } catch (error) {
            console.error("Error generating AI analysis:", error);
            throw error;
        }
    },

    async generateParentReport(patient: any, recentLabs: any[], meds: any[]) {
        try {
            const model = genAI.getGenerativeModel({ model: "demo-gemini-3-flash" }); // Using flash for speed/cost or Pro for quality. User requested 'Intelligent', let's use Pro if available or standard. 
            // Note: The previous code used 'gemini-3-flash-preview', I will stick to that or 'gemini-1.5-pro' if stable. 
            // Let's use the same model key as `analyzeGrowth`.

            const prompt = `
                You are a highly empathetic and professional Pediatric Endocrinologist (소아내분비 전문의).
                Your task is to write a "Growth Report for Guardians" (보호자용 리포트) based on the patient's data.

                **Tone & Style**:
                - Warm, reassuring, and professional.
                - Use polite and gentle Korean (해요체/하십시오체 suitable for parents).
                - Explain medical terms simply but accurately.
                - Address the parents' anxiety by highlighting positive aspects first, then gently mentioning areas for care.

                **Patient Data**:
                - Name: ${patient.name}
                - Age: ${patient.chronologicalAge} years old (Bone Age: ${patient.boneAge} years)
                - Current Height: ${patient.currentHeight || 'N/A'} cm (${patient.percentileString || 'N/A'})
                - Mid-Parental Target Height: ${patient.targetHeight} cm
                - Predicted Adult Height (PAH): ${patient.predictedAdultHeight || 'N/A'} cm
                - Medications: ${JSON.stringify(meds.filter((m: any) => m.status !== 'completed'))} (Hide completed)
                - Recent Labs: ${JSON.stringify(recentLabs)}

                **Report Structure (JSON Format)**:
                Return a JSON object with a 'markdownReport' field containing the full report in Markdown format.

                JSON Structure:
                {
                    "markdownReport": "# 종합 요약 (Executive Summary)\n(2-3 sentences summarizing the child's current growth status warmly.)\n\n## 상세 평가 (Detailed Assessment)\n\n### 🦴 골연령 및 성장 판독 (Bone Age & Growth)\n(Interpretation of bone age vs chronological age. Is it advanced/delayed? What does it mean for final height?)\n\n### 🩸 주요 검사 결과 (Lab Results)\n(Explain key hormones: GH, IGF-1, Sex hormones. Normal or needs attention?)\n\n### 💊 치료 경과 및 투약 관리 (Medication & Treatment)\n(Review current medications. Encouragement on adherence.)\n\n## 💡 향후 제언 (Recommendations)\n\n### ✅ 긍정적인 부분 (Strengths)\n(What is going well? e.g., Good response to treatment, healthy growth velocity.)\n\n### ⚠️ 유의할 점 (Focus Areas)\n(What to watch out for? e.g., Weight control, missed doses, side effects.)\n\n### 👩‍⚕️ 다음 단계 (Next Steps)\n(Recommended follow-up or adjustments.)"
                }

                **Rules**:
                - Do NOT invent false data. If data is missing, say "Data not available" or skip.
                - Completed medications are excluded from the input list, do not mention them unless relevant for context.
                - Language: KOREAN (한국어).
             `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean & Parse
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            return data.markdownReport;

        } catch (error) {
            console.error("Error generating parent report:", error);
            // Fallback text
            return "# 리포트 생성 실패\n\n죄송합니다. AI 리포트를 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        }
    },

    async extractLabResults(file: File): Promise<any[]> {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); // Using 1.5 Flash for OCR as requested (user said 3-flash, assuming 1.5-flash)

            // Convert file to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const result = reader.result as string;
                    // Remove data url prefix (e.g. "data:image/jpeg;base64,")
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
            });

            const prompt = `
                Analyze this medical lab report image and extract the following specific values if they exist:
                1. IGFBP-3
                2. Free T4
                3. TSH
                4. LH
                5. FSH
                6. Estradiol (E2)
                7. Somatomedin-C (IGF-1)
                8. Testosterone

                Return the data as a JSON array with the following structure for each item found:
                {
                    "parameter": "Name of the test (e.g., TSH)",
                    "value": number (numeric value only),
                    "unit": "unit string (e.g., uIU/mL)",
                    "referenceRange": "reference range string",
                    "status": "normal" | "high" | "low" (infer based on reference range)
                }

                Return ONLY the valid JSON array. Do not include markdown formatting or other text.
            `;

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean up code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error("Error extracting lab results:", error);
            throw error;
        }
    }
};
