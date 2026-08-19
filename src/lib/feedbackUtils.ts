import type { FeedbackEntry, ProblemType, QuestionId, Team } from '../types';

export interface ReceivedFeedback {
  reviewerTeamId: string;
  entry: FeedbackEntry;
}

/** 특정 조(teamId)의 특정 질문(qid)에 다른 조들이 남긴 피드백을 모두 모은다. */
export function getFeedbackForQuestion(
  allTeams: Record<string, Team>,
  teamId: string,
  qid: QuestionId,
): ReceivedFeedback[] {
  const entries: ReceivedFeedback[] = [];
  Object.entries(allTeams).forEach(([otherTeamId, otherTeam]) => {
    if (otherTeamId === teamId) return;
    const entry = otherTeam.feedbackGiven?.[teamId]?.[qid];
    if (entry) entries.push({ reviewerTeamId: otherTeamId, entry });
  });
  return entries;
}

export function splitByProblem(entries: ReceivedFeedback[]) {
  const noProblem = entries.filter((e) => e.entry.problemTypes.includes('NONE'));
  const issues = entries.filter((e) => !e.entry.problemTypes.includes('NONE'));
  return { noProblem, issues };
}

/** 이 질문에 대한 모든 피드백에서 등장한 problemTypes를 빈도순으로 집계한다. */
export function countProblemTypes(entries: ReceivedFeedback[]): Partial<Record<ProblemType, number>> {
  const counts: Partial<Record<ProblemType, number>> = {};
  entries.forEach(({ entry }) => {
    entry.problemTypes.forEach((pt) => {
      if (pt === 'NONE') return;
      counts[pt] = (counts[pt] ?? 0) + 1;
    });
  });
  return counts;
}

/** countProblemTypes 결과를 많이 등장한 순서의 배열로 바꾼다 — 중복 태그 대신 "N회" 배지로 보여줄 때 사용. */
export function summarizeProblemTypes(entries: ReceivedFeedback[]): { type: ProblemType; count: number }[] {
  const counts = countProblemTypes(entries);
  return (Object.entries(counts) as [ProblemType, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}
