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
    const { patient, recentLabs, meds, reportContext } = body || {};

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

    const formatNumber = (value: any, digits = 1, suffix = '') => {
      if (value === null || value === undefined) return 'N/A';
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) return 'N/A';
      return `${num.toFixed(digits)}${suffix}`;
    };

    const system =
      'You are a pediatric endocrinologist writing guardian-facing reports. Respond in Korean. ' +
      'When splitting into paragraphs, add a short and clearly visible Korean subheading for each paragraph that matches its topic.';
    const user = `
당신은 소아청소년과 내분비 성장 전문의이며,
성장클리닉에서 보호자에게 아이의 상태를 설명하기 위한 리포트를 작성합니다.

아래에 제공되는 환자의 모든 정보를 종합하여,
의학적으로 정확하지만 일반 보호자도 쉽게 이해할 수 있는
부드럽고 차분한 한글 리포트를 작성하세요.

【입력 정보】
- 연령, 성별
- 키, 체중, BMI 및 성장 백분위
- 최근 성장속도
- 골연령 결과
- Tanner stage
- 혈액검사 결과
- 약물 치료 여부 및 경과

【리포트 기본 조건】
1. 전체 리포트는 **4~5개의 단락**으로 작성하세요.
2. 각 단락은 **200~300자 내외**로 작성하세요.
3. **모두 한글**로 작성하세요.
4. **일반인이 이해할 수 있는 쉬운 표현**을 사용하세요.
5. **한 문장이 너무 길지 않게** 작성하세요.
   - 한 문장에 정보가 과도하게 몰리지 않도록 하세요.
6. 불필요하게 어려운 의학 용어는 사용하지 마세요.
   - 꼭 필요한 경우에는 바로 이어서 쉬운 말로 설명하세요.

【톤 & 말투 지침】
- 실제 병원 진료실에서 보호자에게 설명하는 말투를 사용하세요.
- 너무 딱딱하거나 학술적인 표현은 피하세요.
- 보호자가 과도하게 걱정하지 않도록 부드럽게 설명하세요.
- 단정적인 표현보다는
  “~로 보입니다”, “~한 경향이 있습니다”, “현재로서는”과 같은 표현을 사용하세요.

【단락 구성 가이드】
- 1단락: 아이의 현재 키와 체중, 전반적인 성장 흐름 설명
- 2단락: 골연령과 성장 속도의 의미를 쉽게 설명
- 3단락: 사춘기 진행 상태(Tanner stage)와 혈액검사 결과 요약
- 4단락: 현재 상태에 대한 종합적인 판단과 의미
- (필요 시) 5단락: 향후 진료 계획과 보호자에게 드리는 안내

【중요한 작성 원칙】
- 보호자가 “그래서 우리 아이가 지금 어떤 상태인지”를
  자연스럽게 이해할 수 있도록 설명하세요.
- “지금 당장 걱정할 상황은 아닙니다”,
  “지속적으로 지켜보면 충분한 상태입니다”
  와 같은 안심 문장을 자연스럽게 포함하세요.
- 마지막 문단은 보호자를 배려하는 문장으로 마무리하세요.

위 지침을 반드시 지켜 리포트를 작성하세요.

【환자 데이터】
- 이름: ${patient?.name || 'N/A'}
- 연령, 성별: ${formatNumber(patient?.chronologicalAge, 1, '세')} / ${patient?.gender || 'N/A'}
- 현재 키, 체중, BMI: ${formatNumber(reportContext?.currentHeight, 1, 'cm')} / ${formatNumber(reportContext?.currentWeight, 1, 'kg')} / ${formatNumber(reportContext?.bmi, 1)}
- 성장 백분위(키/체중/BMI): ${formatNumber(reportContext?.heightPercentile, 1, '%')} / ${formatNumber(reportContext?.weightPercentile, 1, '%')} / ${formatNumber(reportContext?.bmiPercentile, 1, '%')}
- 최근 성장속도(cm/년): ${formatNumber(reportContext?.growthVelocity, 1, ' cm/년')}
- 골연령: ${formatNumber(patient?.boneAge, 1, '세')}
- Tanner stage: ${patient?.tannerStage || 'N/A'}
- 혈액검사 결과(IGF-1 포함): ${JSON.stringify(labsWithIgf1 || [])}
- 약물 치료 여부 및 경과: ${JSON.stringify(meds || [])}

반드시 아래 JSON 형식으로만 답변하세요.
{
  "markdownReport": "여기에 4~5개 단락으로 구성된 한글 리포트 전문"
}
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
