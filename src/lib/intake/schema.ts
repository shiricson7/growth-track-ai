export type IntakeFieldType =
  | 'number'
  | 'text'
  | 'textarea'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi';

export type IntakeAnswerValue = string | number | boolean | string[] | null;

export interface IntakeField {
  id: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  unit?: string;
  dependsOn?: {
    id: string;
    value: IntakeAnswerValue;
  };
}

export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  fields: IntakeField[];
}

export const INTAKE_SCHEMA_VERSION = 'v1' as const;

export const intakeSchemaV1: IntakeSection[] = [
  {
    id: 'basic',
    title: '기본 정보',
    description: '자동 입력 항목이 있더라도 확인해 주세요.',
    fields: [
      { id: 'child_name', label: '아이 이름', type: 'text', required: true, placeholder: '예: 김민준' },
      { id: 'birth_date', label: '생년월일', type: 'date', required: true },
      { id: 'sex', label: '성별', type: 'select', required: true, options: ['남', '여'] },
      { id: 'height_cm', label: '최근 키', type: 'number', required: true, unit: 'cm', placeholder: '예: 142.3' },
      { id: 'weight_kg', label: '최근 체중', type: 'number', required: true, unit: 'kg', placeholder: '예: 39.2' },
      { id: 'measure_date', label: '측정일', type: 'date', required: true },
      { id: 'father_cm', label: '아버지 키', type: 'number', required: true, unit: 'cm', placeholder: '예: 175' },
      { id: 'mother_cm', label: '어머니 키', type: 'number', required: true, unit: 'cm', placeholder: '예: 162' },
    ],
  },
  {
    id: 'growth',
    title: '성장 상태',
    description: '최근 성장 속도와 체형에 대한 질문입니다.',
    fields: [
      { id: 'feels_short', label: '또래에 비해 키가 작다고 느낍니다', type: 'boolean' },
      { id: 'slow_growth_1y', label: '최근 1년간 키 성장 속도가 느렸습니다', type: 'boolean' },
      { id: 'height_gain_under_5cm', label: '최근 1년 키 증가가 4–5cm 이하입니다', type: 'boolean' },
      { id: 'sudden_deceleration', label: '성장 속도가 갑자기 느려진 시점이 있습니다', type: 'boolean' },
      {
        id: 'sudden_decel_when',
        label: '시기(나이 또는 날짜)',
        type: 'text',
        placeholder: '예: 8세 무렵 / 2023-03',
        dependsOn: { id: 'sudden_deceleration', value: true },
      },
      { id: 'big_build', label: '체격이 또래보다 큰 편입니다', type: 'boolean' },
    ],
  },
  {
    id: 'puberty',
    title: '사춘기 징후',
    description: '사춘기 증상이 있다면 체크해 주세요.',
    fields: [
      { id: 'signs_early', label: '사춘기 증상이 보인다고 느낍니다', type: 'boolean' },
      {
        id: 'signs',
        label: '해당되는 증상을 모두 선택해 주세요',
        type: 'multi',
        options: ['유방 발달 (여아)', '고환 크기 증가 (남아)', '음모/겨드랑이 털', '여드름', '체취 변화', '변성기'],
        dependsOn: { id: 'signs_early', value: true },
      },
      {
        id: 'signs_start_age',
        label: '증상이 시작된 나이',
        type: 'number',
        unit: '세',
        placeholder: '예: 7.5',
        dependsOn: { id: 'signs_early', value: true },
      },
    ],
  },
  {
    id: 'history',
    title: '병력/약물',
    description: '현재 치료 중인 질환/약물이 있나요?',
    fields: [
      { id: 'meds_now', label: '현재 복용 중인 약물이 있습니다', type: 'boolean' },
      {
        id: 'meds_list',
        label: '복용 중인 약물',
        type: 'text',
        placeholder: '예: 성장호르몬, 스테로이드',
        dependsOn: { id: 'meds_now', value: true },
      },
      { id: 'treated_disease', label: '치료 중인 질환이 있습니다', type: 'boolean' },
      {
        id: 'disease_list',
        label: '치료 중인 질환',
        type: 'text',
        placeholder: '예: 천식, 심장질환',
        dependsOn: { id: 'treated_disease', value: true },
      },
      { id: 'long_steroid', label: '장기간 스테로이드 복용 이력이 있습니다', type: 'boolean' },
    ],
  },
  {
    id: 'lifestyle',
    title: '생활 습관',
    description: '식사, 수면, 운동 정보를 입력해 주세요.',
    fields: [
      { id: 'regular_meals', label: '규칙적으로 식사를 합니다', type: 'boolean' },
      {
        id: 'appetite_vs_peers',
        label: '또래 대비 식욕',
        type: 'select',
        options: ['적다', '비슷', '많다'],
      },
      { id: 'sleep_hours', label: '평균 수면 시간', type: 'number', unit: '시간', placeholder: '예: 8' },
      {
        id: 'exercise_per_week',
        label: '주당 운동 횟수',
        type: 'number',
        unit: '회',
        placeholder: '예: 3',
      },
      { id: 'exercise_type', label: '운동 종류', type: 'text', placeholder: '예: 축구, 수영' },
    ],
  },
  {
    id: 'family',
    title: '가족력',
    description: '가족의 성장/사춘기 관련 정보를 입력해 주세요.',
    fields: [
      { id: 'short_parent', label: '부모 중 키가 작은 편이라고 느끼는 분이 있습니다', type: 'boolean' },
      { id: 'early_puberty_family', label: '부모/형제자매 중 사춘기가 빨랐던 분이 있습니다', type: 'boolean' },
      { id: 'early_stop_growth_family', label: '성장 초기에 크다가 일찍 멈춘 경우가 있습니다', type: 'boolean' },
    ],
  },
  {
    id: 'free',
    title: '추가 질문',
    description: '의사에게 전달하고 싶은 내용을 적어 주세요.',
    fields: [
      { id: 'main_concern', label: '주요 고민', type: 'textarea', placeholder: '예: 키 성장 속도가 느려 걱정됩니다.' },
      { id: 'tx_questions', label: '치료 관련 질문', type: 'textarea', placeholder: '예: 성장호르몬 치료 필요 여부' },
    ],
  },
];

export type IntakeAnswers = Record<string, IntakeAnswerValue>;
