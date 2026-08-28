import { shuffle } from './pokemonNames';
import type { Assignments } from '../types';

export const MIN_TEAMS_FOR_ASSIGNMENT = 2;
const MAX_REVIEWERS_PER_TEAM = 3;

/**
 * N개 조가 있을 때 각 조가 다른 조(최대 3개, N-1개 이하)에 응답하고,
 * 각 조의 질문지가 동일한 수의 조로부터 응답받도록 배정한다.
 *
 * 셔플된 순서에 원형(circulant) 오프셋을 적용하여
 * out-degree=k, in-degree=k, 자기 자신 제외(self-loop 없음)가 보장된다.
 */
export function assignReviewers(teamIds: string[]): Assignments {
  const n = teamIds.length;
  if (n < MIN_TEAMS_FOR_ASSIGNMENT) {
    throw new Error(
      `질문지 응답 활동을 진행하려면 최소 ${MIN_TEAMS_FOR_ASSIGNMENT}개 조가 필요합니다. (현재 ${n}개)`,
    );
  }

  const order = shuffle(teamIds);
  const assignments: Assignments = {};
  const reviewersPerTeam = Math.min(MAX_REVIEWERS_PER_TEAM, n - 1);

  for (let i = 0; i < n; i++) {
    const targets: string[] = [];
    for (let offset = 1; offset <= reviewersPerTeam; offset++) {
      targets.push(order[(i + offset) % n]);
    }
    assignments[order[i]] = targets;
  }

  return assignments;
}

/** assignments를 뒤집어 "이 조의 질문지에 응답하는 조 목록"을 계산한다. */
export function invertAssignments(assignments: Assignments): Record<string, string[]> {
  const reviewers: Record<string, string[]> = {};
  for (const [reviewerId, targets] of Object.entries(assignments)) {
    for (const targetId of targets) {
      (reviewers[targetId] ??= []).push(reviewerId);
    }
  }
  return reviewers;
}
