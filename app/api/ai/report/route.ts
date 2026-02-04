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
    const isFirstVisit = Boolean(reportContext?.firstVisit);

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

    const firstVisitPrompt = `
당신은 성장클리닉을 운영하는 소아청소년과 내분비 전문의입니다.
본 리포트는 저신장 또는 조기 사춘기가 의심되어
처음 성장클리닉에 내원한 소아·청소년 환자의 보호자에게
현재 상태와 향후 평가 방향을 설명하기 위해 작성됩니다.

아래에 제공되는 초진 정보를 종합 분석하여,
의학적으로 정확하지만 보호자가 이해하기 쉬운 한글 리포트를 작성하세요.

【입력 정보】
- 연령, 성별
- 현재 신장, 체중, BMI
- 성장 백분위 및 최근 성장속도(cm/년)
- 과거 성장 기록(있는 경우)
- 부모 신장 및 가족력
- Tanner stage
- 골연령 검사 결과(시행된 경우)
- 혈액검사 결과(시행된 경우)

【리포트 작성 핵심 원칙】
- ‘의심 단계’임을 분명히 하되, 질환을 단정하지 말 것
- 정상 변이 가능성과 추가 평가 필요성을 균형 있게 설명
- 보호자의 불안을 최소화하는 표현을 우선 사용

【형식 및 분량】
1. 전체 리포트는 **4~5개의 단락**으로 구성하세요.
2. 각 단락은 **300~400자 내외**로 작성하세요.
3. 반드시 **모두 한글**로 작성하세요.
4. 실제 진료실에서 보호자와 마주 앉아 설명하는
   차분하고 신뢰감 있는 어조를 사용하세요.

【단락 구성 가이드】
- 1단락: 내원 배경과 현재 성장 또는 사춘기 관련 소견의 요약
- 2단락: 신장·성장속도 또는 사춘기 진행 정도의 의학적 해석
- 3단락: 골연령 및 Tanner stage의 의미와 현재 시점에서의 판단
- 4단락: 저신장 또는 조기 사춘기가 ‘의심되는 이유’와 정상 변이 가능성
- 5단락(선택): 향후 검사·추적 관찰 계획 및 보호자 안내

【의학적 표현 가이드】
- 다음 표현을 적극 활용하세요:
  “현재로서는 ○○ 가능성을 고려해볼 수 있습니다”
  “아직 확정적으로 판단하기에는 이른 단계입니다”
  “성장 패턴을 시간에 따라 확인하는 것이 중요합니다”
- 저신장의 경우:
  · 가족성 저신장
  · 체질성 성장 지연
  · 성장속도 유지 여부
- 조기 사춘기의 경우:
  · 사춘기 변이
  · 진행 속도
  · 골연령과의 관계
를 반드시 언급하되, 일반 용어로 풀어 설명하세요.

【보호자 안심 메시지 필수 포함】
- “현재 단계에서 치료를 바로 결정해야 하는 상황은 아닙니다”
- “정확한 판단을 위해 성장 경과를 보는 것이 중요합니다”
- “조기에 확인하는 것은 오히려 아이에게 도움이 됩니다”
중 2개 이상을 자연스럽게 포함하세요.

【금지 사항】
- 확정 진단 표현 사용 금지
- 치료 시작을 전제로 한 설명 금지
- 예후를 단정적으로 언급하지 말 것

위 지침을 반드시 모두 준수하여
저신장 또는 조기 사춘기 의심 환아의 초진 보호자 설명 리포트를 작성하세요.

【입력 데이터】
- 연령, 성별: ${formatNumber(patient?.chronologicalAge, 1, '세')} / ${patient?.gender || 'N/A'}
- 현재 신장, 체중, BMI: ${formatNumber(reportContext?.currentHeight, 1, 'cm')} / ${formatNumber(reportContext?.currentWeight, 1, 'kg')} / ${formatNumber(reportContext?.bmi, 1)}
- 성장 백분위(키/체중/BMI): ${formatNumber(reportContext?.heightPercentile, 1, '%')} / ${formatNumber(reportContext?.weightPercentile, 1, '%')} / ${formatNumber(reportContext?.bmiPercentile, 1, '%')}
- 최근 성장속도(cm/년): ${formatNumber(reportContext?.growthVelocity, 1, ' cm/년')}
- 과거 성장 기록: ${reportContext?.hasPriorGrowthRecords ? `있음 (${reportContext?.priorGrowthRecordCount}건)` : '없음'}
- 부모 신장 및 가족력: 부 ${formatNumber(patient?.heightFather, 1, 'cm')}, 모 ${formatNumber(patient?.heightMother, 1, 'cm')}, 가족력: ${patient?.familyHistory || '제공되지 않음'}
- Tanner stage: ${patient?.tannerStage || 'N/A'}
- 골연령 검사 결과: ${formatNumber(patient?.boneAge, 1, '세')}
- 혈액검사 결과(IGF-1 포함): ${JSON.stringify(labsWithIgf1 || [])}

반드시 아래 JSON 형식으로만 답변하세요.
{
  "markdownReport": "여기에 4~5개 단락으로 구성된 한글 리포트 전문"
}
`;

    const system = 'You are a pediatric endocrinologist writing guardian-facing reports. Respond in Korean.';
    const standardPrompt = `
당신은 소아청소년과 내분비 전문의이며, 성장클리닉에서 실제 보호자 상담에 사용되는 설명 리포트를 작성합니다.

아래에 제공되는 환자의 모든 정보를 종합적으로 분석하여,
의학적으로 정확하지만 일반 보호자가 이해하기 쉬운 한글 리포트를 작성하세요.

【입력 정보】
- 연령, 성별
- 신장, 체중, BMI 및 성장 백분위 변화
- 성장속도 (cm/년)
- 골연령 결과 및 역연령과의 비교
- Tanner stage
- 혈액검사 결과 (IGF-1, IGFBP-3, 갑상선, 성호르몬 등)
- 현재 또는 과거 약물 치료 여부 (성장호르몬, GnRH agonist 등)
- 치료 시작 시점과 경과

【리포트 작성 원칙】
1. 전체 리포트는 4~5개의 단락으로 구성하세요.
2. 각 단락은 300~400자 내외로 작성하세요.
3. 반드시 모두 한글로 작성하세요.
4. 실제 병원 진료실에서 보호자에게 설명하는 것처럼 전문적이되 부드럽고 차분한 어조로,
   과도한 걱정이나 불안을 유발하지 않는 표현을 사용하세요.
5. 단정적인 표현보다는 “~로 판단됩니다”, “현재로서는 ~한 경향을 보입니다”, “지속적인 관찰이 중요합니다”
   와 같은 임상적인 설명 방식을 사용하세요.
6. 보호자가 이해하기 어려운 의학 용어는 바로 뒤에 쉬운 말로 풀어서 설명하세요.

【단락 구성 가이드】
- 1단락: 현재 성장 상태의 전반적인 요약 (키·체중·성장 흐름 중심)
- 2단락: 골연령과 사춘기 단계(Tanner stage)의 의미와 해석
- 3단락: 혈액검사 결과와 내분비적 평가
- 4단락: 현재 또는 계획된 치료의 목적과 기대 효과
- (필요 시) 5단락: 향후 추적 관찰 계획과 보호자에게 드리는 안내

【톤 & 메시지 가이드】
- “정상 범위”, “관리 가능한 상태”, “경과를 지켜볼 수 있는 단계” 등의 표현을 적극 활용하세요.
- 보호자가 안심할 수 있도록 “현재 상태만으로 성급한 결론을 내릴 필요는 없습니다” 문장을 자연스럽게 포함하세요.
- 보호자를 존중하는 말투로 마무리하세요.

이 지침을 반드시 모두 지켜 리포트를 작성하세요.

환자 데이터:
- 이름: ${patient?.name}
- 연령/성별: ${patient?.chronologicalAge}세 / ${patient?.gender}
- 현재 키/체중: ${patient?.currentHeight || 'N/A'}cm / ${patient?.currentWeight || 'N/A'}kg
- 백분위/추세: ${patient?.percentileString || 'N/A'}
- 목표키(MPH): ${patient?.targetHeight} cm
- 예측 성인키(PAH): ${patient?.predictedAdultHeight || 'N/A'} cm
- Tanner stage: ${patient?.tannerStage || 'N/A'}
- 골연령: ${patient?.boneAge || 'N/A'}
- 약물: ${JSON.stringify((meds || []).filter((m: any) => m.status !== 'completed'))}
- 검사 결과(IGF-1 포함): ${JSON.stringify(labsWithIgf1 || [])}

응답은 다음 JSON 구조로만 반환하세요:
{
  "markdownReport": "여기에 4~5개 단락으로 구성된 한글 리포트 전문"
}
`;

    const user = isFirstVisit ? firstVisitPrompt : standardPrompt;

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
