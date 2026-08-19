import type { ScaleType } from '../types';

export interface ScaleTypeInfo {
  id: ScaleType;
  label: string;
  description: string;
}

export const SCALE_TYPES: ScaleTypeInfo[] = [
  { id: 'LIKERT_5', label: '5점 척도', description: '전혀 그렇지 않다 ~ 매우 그렇다' },
  { id: 'MULTIPLE_CHOICE', label: '객관식', description: '선택지를 직접 만들어요 (예: 1권 이하 / 2~3권 / 4권 이상)' },
  { id: 'NUMBER', label: '숫자로 답하기', description: '숫자로 답해요 (예: 몇 권, 몇 시간)' },
];

export function getScaleTypeInfo(id: ScaleType): ScaleTypeInfo {
  return SCALE_TYPES.find((s) => s.id === id) ?? SCALE_TYPES[0];
}

export const MIN_CHOICE_OPTIONS = 2;
export const MAX_CHOICE_OPTIONS = 5;
