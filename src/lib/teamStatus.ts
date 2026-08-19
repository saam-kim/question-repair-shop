import type { Assignments, Team } from '../types';
import type { ProgressState } from '../components/ProgressBadge';
import { invertAssignments } from './assignmentAlgorithm';

export function questionStatus(team: Team): ProgressState {
  if (team.questionsSubmittedAt) return 'DONE';
  if (team.topic) return 'IN_PROGRESS';
  return 'WAITING';
}

/** 이 조가 배정받은 다른 3개 조에게 응답을 얼마나 마쳤는지 */
export function respondingStatus(team: Team, assignments: Assignments, teamId: string): ProgressState {
  const targets = assignments[teamId];
  if (!targets || targets.length === 0) return 'WAITING';
  const doneCount = targets.filter((t) => team.respondingProgress?.[t] === 'DONE').length;
  if (doneCount === targets.length) return 'DONE';
  if (doneCount > 0) return 'IN_PROGRESS';
  return 'WAITING';
}

/** 이 조의 질문지에 다른 조들의 응답(+피드백)이 얼마나 도착했는지 */
export function feedbackReceivedStatus(
  teamId: string,
  assignments: Assignments,
  allTeams: Record<string, Team>,
): ProgressState {
  const reviewers = invertAssignments(assignments)[teamId];
  if (!reviewers || reviewers.length === 0) return 'WAITING';
  const doneCount = reviewers.filter((r) => allTeams[r]?.respondingProgress?.[teamId] === 'DONE').length;
  if (doneCount === reviewers.length) return 'DONE';
  if (doneCount > 0) return 'IN_PROGRESS';
  return 'WAITING';
}

export function revisionStatus(team: Team): ProgressState {
  return team.revisionsSubmittedAt ? 'DONE' : 'WAITING';
}
