import type { ProblemType, ScaleType } from '../types';

export interface ProblemTypeInfo {
  id: ProblemType;
  label: string;
  severity: 'NONE' | 'REQUIRED' | 'IMPROVEMENT';
  /** 비상교육 『사회와 문화』 36쪽 필수 조건 번호 (해당 시) */
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
    label: '질문의 의미가 모호하다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ① 명확성',
    description: '질문은 내용을 명확하게 해야 합니다.',
  },
  {
    id: 'DOUBLE_BARRELED',
    label: '두 가지 이상의 내용을 한꺼번에 묻는다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ② 단일 쟁점',
    description: '한 문항에서는 한 가지 질문만 해야 합니다.',
  },
  {
    id: 'OVERLAPPING_OPTIONS',
    label: '선택지끼리 내용이 겹친다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ③ 중복 배제',
    description: '응답 선택지 간에 중복된 내용이 없어야 합니다.',
    onlyForScaleType: ['LIKERT_5'],
  },
  {
    id: 'LEADING',
    label: '특정 답변을 유도하는 느낌이 든다',
    severity: 'REQUIRED',
    requiredRuleLabel: '필수 조건 ④ 유도성 배제',
    description: '특정 응답을 유도하는 질문을 하지 않아야 합니다.',
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
