import { getLikertLabels } from './likertScale';
import type { AnswerValue, QuestionId, QuestionItem, Team } from '../types';

export interface ResponseSummary {
  total: number;
  counts: { label: string; count: number }[];
  written: string[];
}

export function formatAnswer(value: AnswerValue, question?: QuestionItem): string {
  if (Array.isArray(value)) return value.join(', ');
  if (question?.scaleType === 'LIKERT_5' && typeof value === 'number') {
    return `${value}. ${getLikertLabels(question.likertLabels)[value - 1] ?? value}`;
  }
  return String(value);
}

export function getResponseSummary(
  teams: Record<string, Team>, targetId: string, qid: QuestionId, question?: QuestionItem,
): ResponseSummary {
  const answers = Object.values(teams)
    .map((team) => team.responsesGiven?.[targetId]?.[qid]?.value)
    .filter((value): value is AnswerValue => value !== undefined);
  const labels = question?.scaleType === 'YES_NO'
    ? ['예', '아니요']
    : question?.scaleType === 'LIKERT_5'
      ? getLikertLabels(question.likertLabels).map((label, i) => `${i + 1}. ${label}`)
      : question?.scaleType === 'MULTI_SELECT'
        ? (question.options ?? []).map((label, i) => `${i + 1}. ${label}`)
        : [];
  if (question?.hasOtherOption && labels.length) labels.push('기타');
  const counts = labels.map((label, i) => ({
    label,
    count: answers.filter((value) => {
      if (label === '기타') return typeof value === 'string' && value.startsWith('기타:') ||
        Array.isArray(value) && value.some((v) => v.startsWith('기타:'));
      if (question?.scaleType === 'LIKERT_5') return value === i + 1;
      if (question?.scaleType === 'YES_NO') return value === label;
      return Array.isArray(value) && value.includes(question?.options?.[i] ?? '');
    }).length,
  }));
  const written = answers.flatMap((value) => {
    if (Array.isArray(value)) return value.filter((v) => v.startsWith('기타: ')).map((v) => v.slice(4));
    if (typeof value !== 'string') return [];
    if (value.startsWith('기타: ')) return [value.slice(4)];
    return question?.scaleType === 'ESSAY' || question?.scaleType === 'SHORT_ANSWER' ? [value] : [];
  });
  return { total: answers.length, counts, written };
}
