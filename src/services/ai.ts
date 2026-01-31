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
    }
};
