import type { IntakeAnswers } from './schema';
import type { IntakeFlags } from './flags';

export const FLAG_LABELS: Record<keyof IntakeFlags, string> = {
  flag_low_velocity: '연간 성장속도 저하 가능',
  flag_secondary_cause: '이차성 원인 가능성',
  flag_puberty_early: '조기 사춘기 의심',
  flag_family_history: '가족력 양성',
};

const YES_LABELS: Array<{ id: keyof IntakeAnswers; label: string }> = [
  { id: 'feels_short', label: '또래 대비 키가 작다고 느낌' },
  { id: 'slow_growth_1y', label: '최근 1년 성장 속도 저하' },
  { id: 'height_gain_under_5cm', label: '최근 1년 키 증가 4–5cm 이하' },
  { id: 'sudden_deceleration', label: '성장 속도 급감 시점 있음' },
  { id: 'big_build', label: '체구가 큰 편' },
  { id: 'signs_early', label: '사춘기 징후 빠르다고 느낌' },
  { id: 'meds_now', label: '현재 복용 약물 있음' },
  { id: 'treated_disease', label: '치료 중인 질환 있음' },
  { id: 'long_steroid', label: '장기 스테로이드 사용력' },
  { id: 'regular_meals', label: '식사 규칙적' },
  { id: 'short_parent', label: '부모 중 키가 작은 편' },
  { id: 'early_puberty_family', label: '가족 내 사춘기 빠름' },
  { id: 'early_stop_growth_family', label: '성장 조기 종료 가족력' },
];

export const buildSummary = (answers: IntakeAnswers) => {
  const summary: string[] = [];

  for (const item of YES_LABELS) {
    if (answers[item.id] === true) summary.push(item.label);
  }

  if (answers.sudden_deceleration === true && answers.sudden_decel_when) {
    summary.push(`성장 둔화 시기: ${answers.sudden_decel_when}`);
  }

  if (answers.signs_early === true) {
    if (Array.isArray(answers.signs) && answers.signs.length > 0) {
      summary.push(`사춘기 변화: ${answers.signs.join(', ')}`);
    }
    if (answers.signs_start_age !== null && answers.signs_start_age !== undefined && answers.signs_start_age !== '') {
      summary.push(`사춘기 시작 나이: ${answers.signs_start_age}세`);
    }
  }

  if (answers.meds_now === true && answers.meds_list) {
    summary.push(`복용 약물: ${answers.meds_list}`);
  }

  if (answers.treated_disease === true && answers.disease_list) {
    summary.push(`치료 질환: ${answers.disease_list}`);
  }

  return summary;
};
