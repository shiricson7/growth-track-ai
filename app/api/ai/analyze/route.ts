import { NextResponse } from 'next/server';
import { callOpenAI, extractOutputText, OPENAI_MODEL, safeJsonParse } from '../shared';
import {
  calculateIGF1Percentile,
  getAgeYearsAtDate,
  getIGF1RangeForSex,
  isIGF1Parameter,
  isLikelyNgMlUnit,
} from '../../../../src/utils/igf1Roche';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI 기능이 비활성화되어 있습니다.' }, { status: 503 });
    }

    const body = await request.json();
    const { patientData, measurements, labResults } = body || {};

    const labsWithIgf1 = (labResults || []).map((lab: any) => {
      if (!isIGF1Parameter(lab.parameter)) return lab;
      const ageYears = getAgeYearsAtDate(patientData?.dob, lab.date);
      const unitOk = isLikelyNgMlUnit(lab.unit);
      const range = unitOk ? getIGF1RangeForSex(ageYears, patientData?.gender) : null;
      const percentile = unitOk ? calculateIGF1Percentile(lab.value, ageYears, patientData?.gender) : null;
      return {
        ...lab,
        igf1AgeYears: ageYears,
        igf1ReferenceLow: range?.low ?? null,
        igf1ReferenceHigh: range?.high ?? null,
        igf1Percentile: percentile,
        igf1UnitMatch: unitOk,
      };
    });

    const system = 'You are an expert pediatric endocrinologist. Respond in Korean.';
    const user = `
Patient: ${JSON.stringify(patientData)}
Measurements (Chronological): ${JSON.stringify(measurements)}
Lab Results (IGF-1 enriched): ${JSON.stringify(labsWithIgf1)}

Please provide:
1. Growth Pattern Analysis (Height velocity, BMI trend)
2. Pubertal Status Assessment (use Tanner stage if provided, bone age, and lab results if available)
3. Predicted Adult Height (PAH) in cm. Calculate based on current height, bone age, and mid-parental height if available.
4. Recommendations for further testing or monitoring
5. A brief summary for the parent (friendly language)
6. If IGF-1 is present, include its percentile based on Roche Elecsys reference intervals.
   Use igf1Percentile if provided. If igf1UnitMatch is false or igf1Percentile is null, do not guess.
7. Do not give a generic "keep injecting diligently" message. If hormone levels and bone age suggest treatment may be nearing completion,
   explain that and outline criteria to consider a treatment end point (e.g., growth velocity, bone age progression, pubertal stage).

Format the output as a valid JSON object with this structure:
{
  "analysis": ["point 1 textual analysis...", "point 2...", "summary..."],
  "predictedHeight": number (e.g. 175.5)
}
Do not include markdown code blocks. Just the raw JSON.
IMPORTANT: All textual analysis, summary, and recommendations MUST be in KOREAN language.
`;

    const payload = {
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: system }] },
        { role: 'user', content: [{ type: 'input_text', text: user }] },
      ],
      temperature: 0.2,
      max_output_tokens: 1200,
    };

    const result = await callOpenAI(payload);
    const text = extractOutputText(result);
    const data = safeJsonParse(text);

    return NextResponse.json({
      analysis: data.analysis || [],
      predictedHeight: data.predictedHeight,
    });
  } catch (error: any) {
    console.error('AI analyze error', error);
    return NextResponse.json({ error: error?.message || 'AI 분석 실패' }, { status: 500 });
  }
}
