import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export const aiService = {
    async analyzeGrowth(patientData: any, measurements: any[], labResults: any[]) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Using 1.5 Pro as requested (mapped to latest)

            const prompt = `
        You are an expert pediatric endocrinologist. Analyze the following patient data and provide a clinical assessment.
        
        Patient: ${JSON.stringify(patientData)}
        Measurements (Chronological): ${JSON.stringify(measurements)}
        Lab Results: ${JSON.stringify(labResults)}

        Please provide:
        1. Growth Pattern Analysis (Height velocity, BMI trend)
        2. Pubertal Status Assessment (based on bone age and lab results if available)
        3. Predicted Adult Height (if calculable)
        4. Recommendations for further testing or monitoring
        5. A brief summary for the parent (friendly language)

        Format the output in clear Markdown suitable for a medical report.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Error generating AI analysis:", error);
            throw error;
        }
    },

    async extractLabResults(file: File): Promise<any[]> {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using 1.5 Flash for OCR as requested (user said 3-flash, assuming 1.5-flash)

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
