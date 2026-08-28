import type { FeedbackEntry, QuestionId, ScaleType } from '../types';

export const SAMPLE_TOPICS = [
  '학생들의 학교생활 만족도',
  '학생들의 스마트폰 사용 실태',
  '청소년의 독서 및 여가생활',
  '학교 급식 만족도 및 식습관',
];

export interface SampleQuestionSpec {
  text: string;
  scaleType: ScaleType;
  likertLabels?: string[];
  hasOtherOption?: boolean;
  unit?: string;
}

export const SAMPLE_QUESTION_SPECS: Record<QuestionId, SampleQuestionSpec> = {
  q1: {
    text: '나는 이 주제에 대해 전반적으로 만족한다.',
    scaleType: 'LIKERT_5',
  },
  q2: {
    text: '나는 이 주제 관련 활동에 자주 참여하고 만족하는 편이다.',
    scaleType: 'ESSAY',
  },
  q3: {
    text: '최근 1주일 동안 이 활동에 참여한 시간은 대략 얼마인가요?',
    scaleType: 'SHORT_ANSWER',
    unit: '시간',
  },
};

export function sampleResponseValue(
  scaleType: ScaleType,
  _likertLabels?: string[],
  unit?: string,
): number | string {
  if (scaleType === 'LIKERT_5') return 4;
  if (scaleType === 'ESSAY') {
    return '평소에 관심이 많아 자주 찾아보고 있으며, 활동을 통해 많은 것을 배우고 있습니다.';
  }
  if (scaleType === 'SHORT_ANSWER') {
    return unit ? `5 ${unit}` : '3회';
  }
  return 4;
}

/**
 * 리허설 자동 채우기 시 사용자가 요청한 3가지 피드백 분포를 생성:
 * - Q1: 문제 없음 (모든 조가 NONE)
 * - Q2: 한 가지 유형의 피드백 + 문제 없음 (1개 조는 DOUBLE_BARRELED, 나머지는 NONE)
 * - Q3: 두 가지 이상의 피드백 유형 (조별로 UNCLEAR, LEADING, ANSWERING_DIFFICULT 등 복수 피드백)
 */
export function sampleFeedbackForQuestion(
  qid: QuestionId,
  reviewerIndex: number,
): FeedbackEntry {
  const now = Date.now();

  if (qid === 'q1') {
    // 문항 1: 문제 없음
    return {
      problemTypes: ['NONE'],
      comment: '',
      createdAt: now,
    };
  }

  if (qid === 'q2') {
    // 문항 2: 1개 조는 한 가지 유형 피드백, 다른 조는 문제 없음
    if (reviewerIndex === 0) {
      return {
        problemTypes: ['DOUBLE_BARRELED'],
        comment: '참여 빈도와 만족도를 한 문항에서 한꺼번에 묻고 있어 답하기 곤란해요.',
        createdAt: now,
      };
    }
    return {
      problemTypes: ['NONE'],
      comment: '',
      createdAt: now,
    };
  }

  // 문항 3: 2가지 이상의 피드백 유형 제출
  if (reviewerIndex === 0) {
    return {
      problemTypes: ['UNCLEAR', 'LEADING'],
      comment: '활동의 범위가 모호하고 특정 답변을 유도하는 느낌이 듭니다.',
      createdAt: now,
    };
  } else if (reviewerIndex === 1) {
    return {
      problemTypes: ['ANSWERING_DIFFICULT', 'UNCLEAR'],
      comment: '지난 1주일간의 시간을 정확히 기억해서 숫자로 적기 어렵습니다.',
      createdAt: now,
    };
  }

  return {
    problemTypes: ['UNCLEAR'],
    comment: '어떤 활동을 의미하는지 구체적인 예시가 필요해요.',
    createdAt: now,
  };
}
