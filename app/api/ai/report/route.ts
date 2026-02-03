import { NextResponse } from 'next/server';
import { callOpenAI, extractOutputJson, extractOutputText, OPENAI_MODEL, safeJsonParse } from '../shared';
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
    const { patient, recentLabs, meds } = body || {};

    const labsWithIgf1 = (recentLabs || []).map((lab: any) => {
      if (!isIGF1Parameter(lab.parameter)) return lab;
      const ageYears = getAgeYearsAtDate(patient?.dob, lab.date);
      const unitOk = isLikelyNgMlUnit(lab.unit);
      const range = unitOk ? getIGF1RangeForSex(ageYears, patient?.gender) : null;
      const percentile = unitOk ? calculateIGF1Percentile(lab.value, ageYears, patient?.gender) : null;
      return {
        ...lab,
        igf1AgeYears: ageYears,
        igf1ReferenceLow: range?.low ?? null,
        igf1ReferenceHigh: range?.high ?? null,
        igf1Percentile: percentile,
        igf1UnitMatch: unitOk,
      };
    });

    const system = 'You are a highly empathetic and professional Growth Specialist. Respond in Korean.';
    const user = `
Your task is to write a "Growth Report for Guardians" based on the patient's data.

Tone & Style:
- Warm, reassuring, and professional.
- Use polite and gentle Korean suitable for parents.
- Explain medical terms simply but accurately.
- Address the parents' anxiety by highlighting positive aspects first, then gently mentioning areas for care.
- Do NOT use emojis or emoticons.

Patient Data:
- Name: ${patient?.name}
- Age: ${patient?.chronologicalAge} years old (Bone Age: ${patient?.boneAge} years)
- Current Height: ${patient?.currentHeight || 'N/A'} cm (${patient?.percentileString || 'N/A'})
- Mid-Parental Target Height: ${patient?.targetHeight} cm
- Predicted Adult Height (PAH): ${patient?.predictedAdultHeight || 'N/A'} cm
- Medications: ${JSON.stringify((meds || []).filter((m: any) => m.status !== 'completed'))}
- Recent Labs (IGF-1 enriched): ${JSON.stringify(labsWithIgf1 || [])}

Report Structure (JSON Format):
Return a JSON object with a 'markdownReport' field containing the full report in Markdown format.

JSON Structure:
{
  "markdownReport": "# 종합 요약 (Executive Summary)\\n(2-3 sentences summarizing the child's current growth status warmly.)\\n\\n## 상세 평가 (Detailed Assessment)\\n\\n### 골연령과 성장 (Bone Age & Growth)\\n(Interpretation of bone age vs chronological age. Is it advanced/delayed? What does it mean for final height?)\\n\\n### 주요 검사 결과 (Lab Results)\\n(Explain key hormones: GH, IGF-1, Sex hormones. Normal or needs attention? If IGF-1 is present, include percentile based on Roche Elecsys reference intervals; use igf1Percentile if provided.)\\n\\n### 투약 및 치료 관리 (Medication & Treatment)\\n(Review current medications. Encouragement on adherence.)\\n\\n## 향후 권고 (Recommendations)\\n\\n### 긍정적인 부분 (Strengths)\\n(What is going well? e.g., Good response to treatment, healthy growth velocity.)\\n\\n### 주의사항 (Focus Areas)\\n(What to watch out for? e.g., Weight control, missed doses, side effects.)\\n\\n### 다음 단계 (Next Steps)\\n(Recommended follow-up or adjustments.)"
}

Rules:
- Do NOT invent false data. If data is missing, say "Data not available" or skip.
- Completed medications are excluded from the input list, do not mention them unless relevant for context.
- Language: KOREAN.
`;

    const payload = {
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: system }] },
        { role: 'user', content: [{ type: 'input_text', text: user }] },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'growth_report',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              markdownReport: { type: 'string' },
            },
            required: ['markdownReport'],
          },
        },
      },
      temperature: 0.2,
      max_output_tokens: 1800,
    };

    const result = await callOpenAI(payload);
    const json = extractOutputJson(result);
    const data = json ?? safeJsonParse(extractOutputText(result));
    if (!data) {
      console.error('AI report parse failed', {
        output_text: extractOutputText(result),
        output: result?.output,
      });
      return NextResponse.json(
        {
          markdownReport: '# AI 응답 오류\n\nAI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      markdownReport: data.markdownReport || '',
    });
  } catch (error: any) {
    console.error('AI report error', error);
    return NextResponse.json({ error: error?.message || 'AI 리포트 생성 실패' }, { status: 500 });
  }
}
