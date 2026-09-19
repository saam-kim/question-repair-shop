import type { ProblemType, ScaleType } from '../types';

export interface ProblemTypeInfo {
  id: ProblemType;
  label: string;
  severity: 'NONE' | 'REQUIRED' | 'IMPROVEMENT';
  /** 질문지 작성 시 유의점을 문장으로 풀어 쓴 안내 문구 (해당 시) */
  requiredRuleLabel?: string;
  description: string;
  /** 특정 응답 방식(예: 5점 척도)에서만 의미가 있는 항목이면 표시 */
  onlyForScaleType?: ScaleType[];
}

export const PROBLEM_TYPES: ProblemTypeInfo[] = [
  {
    id: 'NONE',
    label: '문제 없음',
    severity: 'NONE',
    description: '이 질문에 답하는 데 불편함이 없었어요.',
  },
  {
    id: 'UNCLEAR',
    label: '질문의 의미가 명확하지 않다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ① 질문의 의미를 명확하게 하기',
    description: '응답자가 질문을 같은 의미로 이해할 수 있도록 질문의 내용을 명확하게 해야 합니다.',
  },
  {
    id: 'DOUBLE_BARRELED',
    label: '한 문항에 두 가지 이상의 내용을 묻는다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ② 한 문항에 한 가지 내용만 묻기',
    description: '한 문항에서는 한 가지 내용만 물어야 합니다.',
  },
  {
    id: 'OVERLAPPING_OPTIONS',
    label: '응답 선택지가 서로 겹친다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ③ 응답 선택지가 서로 겹치지 않게 하기',
    description: '하나의 응답이 둘 이상의 선택지에 해당하지 않도록 응답 선택지를 구성해야 합니다.',
    onlyForScaleType: ['LIKERT_5'],
  },
  {
    id: 'LEADING',
    label: '특정 응답을 유도하는 질문이다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ④ 특정 응답을 유도하지 않기',
    description: '질문자의 의도나 가치 판단이 개입되어 특정 응답을 유도하지 않도록 해야 합니다.',
  },
  {
    id: 'ANSWERING_DIFFICULT',
    label: '응답하기 어렵다',
    severity: 'IMPROVEMENT',
    description: '응답자가 실제로 답하기 어려운 질문일 수 있습니다.',
  },
  {
    id: 'OTHER',
    label: '기타',
    severity: 'IMPROVEMENT',
    description: '그 밖에 느껴진 불편함이 있어요.',
  },
];

export function getProblemTypeInfo(id: ProblemType): ProblemTypeInfo {
  return PROBLEM_TYPES.find((p) => p.id === id) ?? PROBLEM_TYPES[PROBLEM_TYPES.length - 1];
}

/** 이 질문의 응답 방식(scaleType)에서 실제로 의미가 있는 문제 유형만 골라준다. */
export function getApplicableProblemTypes(scaleType: ScaleType): ProblemTypeInfo[] {
  return PROBLEM_TYPES.filter(
    (p) => !p.onlyForScaleType || p.onlyForScaleType.includes(scaleType),
  );
}
