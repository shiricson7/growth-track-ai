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

    const system =
      'You are a pediatric endocrinologist with over 30 years of clinical experience. Write in Korean for specialist-to-specialist communication.';
    const user = `
당신은 소아내분비 분야에서 30년 이상의 임상 경험을 가진 전문의입니다.
동료 소아청소년과 의사 또는 소아내분비 전문의에게 공유하는
의학적 성장 평가 및 치료 경과 리포트를 작성하세요.

본 리포트는 보호자 설명용이 아닌,
의무기록 및 전문의 간 컨설트 목적의 문서입니다.

【입력 정보】
- 환자 성별, 연령 (CA)
- 신장, 체중, BMI 및 SDS
- 성장속도 (cm/year) 및 시기별 변화
- 골연령(BA) 결과 및 BA/CA ratio
- Tanner stage (유방/고환 용적/음모 단계 등)
- 혈액검사 결과
  (IGF-1 SDS, IGFBP-3, GH stimulation test 결과,
   TSH, fT4, LH/FSH, Estradiol/Testosterone 등)
- 영상 및 기타 검사 결과 (필요 시)
- 치료 이력
  (rhGH, GnRH agonist 등 투여 용량, 기간, 순응도)
- 치료 반응 및 부작용 여부

【작성 형식 및 분량】
1. 전체 리포트는 4–5개의 단락으로 구성
2. 각 단락은 300–400자 내외
3. 모두 한글로 작성
4. 불필요한 설명이나 보호자용 완화 표현은 배제하고,
   객관적·임상적·분석 중심으로 서술하세요.

【단락 구성 가이드】
- 1단락: 성장 상태 요약
  (현재 auxological status, SDS 변화, 성장속도 평가)
- 2단락: 골연령 및 사춘기 진행 평가
  (BA advancement, pubertal tempo, Tanner stage 해석)
- 3단락: 내분비학적 평가
  (IGF axis, GH 분비, 갑상선/성선 기능 분석)
- 4단락: 치료 적응증 및 치료 반응 평가
  (rhGH/GnRH agonist indication, response, catch-up growth 여부)
- (필요 시) 5단락: 향후 치료 전략 및 추적 계획

【서술 스타일】
- 전문적인 의학 용어 사용을 제한하지 마세요.
- 진단적 판단은
  “~로 판단됨”, “~ 가능성 고려됨”, “~ 감별 필요”
  와 같은 학술적 표현을 사용하세요.
- 불확실한 경우 differential diagnosis 형태로 기술하세요.
- 임상 경험이 풍부한 전문의의 시각에서
  핵심만 간결하고 밀도 있게 서술하세요.

【주의사항】
- 보호자 대상 설명체 사용 금지
- 감정적·안심 유도 문구 사용 금지
- 추상적인 표현 대신 수치·경향·비교 중심으로 기술

위 지침을 모두 준수하여
전문의 간 공유 가능한 고수준의 소아내분비 성장 평가 리포트를 작성하세요.

환자 데이터:
- Patient: ${JSON.stringify(patientData)}
- Measurements (Chronological): ${JSON.stringify(measurements)}
- Lab Results (IGF-1 enriched): ${JSON.stringify(labsWithIgf1)}

응답은 다음 JSON 구조로만 반환하세요:
{
  "analysis": ["단락1", "단락2", "단락3", "단락4", "단락5"],
  "predictedHeight": number (예: 175.5)
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
          name: 'growth_analysis',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              analysis: {
                type: 'array',
                items: { type: 'string' },
              },
              predictedHeight: {
                type: ['number', 'null'],
              },
            },
            required: ['analysis', 'predictedHeight'],
          },
        },
      },
      temperature: 0.1,
      max_output_tokens: 3200,
    };

    const result = await callOpenAI(payload);
    const incompleteOutput = Array.isArray(result?.output)
      ? result.output.some((item: any) => item?.status === 'incomplete')
      : false;
    if (result?.status === 'incomplete' || incompleteOutput) {
      return NextResponse.json(
        {
          analysis: ['AI 응답이 길어서 중단되었습니다. 다시 시도해주세요.'],
          predictedHeight: null,
        },
        { status: 200 }
      );
    }
    const json = extractOutputJson(result);
    const data = json ?? safeJsonParse(extractOutputText(result));
    if (!data) {
      console.error('AI analyze parse failed', {
        output_text: extractOutputText(result),
        output: result?.output,
      });
      return NextResponse.json(
        {
          analysis: ['AI 응답 파싱에 실패했습니다. 잠시 후 다시 시도해주세요.'],
          predictedHeight: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      analysis: data.analysis || [],
      predictedHeight: data.predictedHeight ?? null,
    });
  } catch (error: any) {
    console.error('AI analyze error', error);
    return NextResponse.json({ error: error?.message || 'AI 분석 실패' }, { status: 500 });
  }
}
