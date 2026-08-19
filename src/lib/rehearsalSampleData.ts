import type { QuestionId, ScaleType } from '../types';

export const SAMPLE_TOPICS = ['학생들의 학교생활 만족도', '학생들의 스마트폰 사용', '청소년의 여가생활', '학교 급식 만족도'];

export const SAMPLE_QUESTIONS: Record<QuestionId, string> = {
  q1: '나는 이 주제에 대해 전반적으로 만족한다.',
  q2: '나는 이 주제와 관련된 활동에 자주 참여한다.',
  q3: '나는 이 주제에 대해 앞으로도 관심을 가질 것이다.',
};

/** 척도 유형별로 그럴듯한 응답 하나를 골라준다 (리허설 자동 채우기용). */
export function sampleResponseValue(scaleType: ScaleType, options?: string[]): number | string {
  if (scaleType === 'MULTIPLE_CHOICE') return options?.[0] ?? '';
  if (scaleType === 'NUMBER') return 3;
  return 3;
}
