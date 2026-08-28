import type { ScaleType } from '../types';

export interface ScaleTypeInfo {
  id: ScaleType;
  label: string;
  description: string;
}

export const SCALE_TYPES: ScaleTypeInfo[] = [
  {
    id: 'LIKERT_5',
    label: '5점 척도',
    description: '5단계 척도로 응답 (척도 문구 수정 및 기타 옵션 가능)',
  },
  {
    id: 'ESSAY',
    label: '서술형 주관식',
    description: '생각이나 이유를 긴 문장으로 자유롭게 작성',
  },
  {
    id: 'SHORT_ANSWER',
    label: '단답형 주관식',
    description: '단어나 숫자, 단위(예: 권, 시간)로 간결하게 답변',
  },
];

export function getScaleTypeInfo(id: ScaleType | string): ScaleTypeInfo {
  // 레거시 타입과의 호환성 유지
  if (id === 'MULTIPLE_CHOICE' || id === 'NUMBER') {
    return id === 'NUMBER'
      ? { id: 'SHORT_ANSWER', label: '단답형 주관식', description: '단어나 숫자, 단위로 답변' }
      : { id: 'LIKERT_5', label: '5점 척도', description: '선택지형 응답' };
  }
  return SCALE_TYPES.find((s) => s.id === id) ?? SCALE_TYPES[0];
}
