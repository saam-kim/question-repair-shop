import * as remote from './firestoreDb';
import { isRehearsal, updateRehearsal } from '../lib/rehearsalStore';
import type { QuestionId, Assignments, SessionPhase, ProblemType } from '../types';
import type { QuestionInput, RevisionInput } from './firestoreDb';
export type { QuestionInput, RevisionInput } from './firestoreDb';
export { listTeacherSessions, deleteSession } from './firestoreDb';
export {
  getDb,
  sessionDocRef,
  teamDocRef,
  createSession,
  findSessionByCode,
  joinOrCreateTeam,
} from './firestoreDb';

export async function setTeamTopic(id: string, team: string, topic: string) {
  return isRehearsal(id)
    ? updateRehearsal(id, team, { topic })
    : remote.setTeamTopic(id, team, topic);
}
export async function submitQuestions(
  id: string,
  team: string,
  questions: Record<QuestionId, QuestionInput>,
) {
  if (!isRehearsal(id)) return remote.submitQuestions(id, team, questions);
  const now = Date.now();
  return updateRehearsal(id, team, {
    questionsSubmittedAt: now,
    questions: Object.fromEntries(
      Object.entries(questions).map(([qid, q], i) => [qid, { ...q, order: i + 1, createdAt: now }]),
    ),
  });
}
export async function writeAssignments(id: string, assignments: Assignments) {
  return isRehearsal(id)
    ? updateRehearsal(id, null, { assignments })
    : remote.writeAssignments(id, assignments);
}
export async function submitResponseAndFeedback(
  id: string,
  team: string,
  target: string,
  qid: QuestionId,
  value: number | string,
  feedback: { problemTypes: ProblemType[]; comment: string },
) {
  if (!isRehearsal(id))
    return remote.submitResponseAndFeedback(id, team, target, qid, value, feedback);
  return updateRehearsal(id, team, {
    [`responsesGiven.${target}.${qid}`]: { value, respondedAt: Date.now() },
    [`feedbackGiven.${target}.${qid}`]: { ...feedback, createdAt: Date.now() },
  });
}
export async function markRespondingDone(id: string, team: string, target: string) {
  return isRehearsal(id)
    ? updateRehearsal(id, team, { [`respondingProgress.${target}`]: 'DONE' })
    : remote.markRespondingDone(id, team, target);
}
export async function submitRevisions(
  id: string,
  team: string,
  revisions: Record<QuestionId, RevisionInput>,
) {
  if (!isRehearsal(id)) return remote.submitRevisions(id, team, revisions);
  return updateRehearsal(id, team, {
    revisionsSubmittedAt: Date.now(),
    revisions: Object.fromEntries(
      Object.entries(revisions).map(([qid, r]) => [qid, { ...r, createdAt: Date.now() }]),
    ),
  });
}
export async function startClass(id: string) {
  return isRehearsal(id)
    ? updateRehearsal(id, null, { status: 'ACTIVE', currentPhase: 'QUESTION' })
    : remote.startClass(id);
}
export async function pauseClass(id: string) {
  return isRehearsal(id) ? updateRehearsal(id, null, { status: 'PAUSED' }) : remote.pauseClass(id);
}
export async function resumeClass(id: string) {
  return isRehearsal(id) ? updateRehearsal(id, null, { status: 'ACTIVE' }) : remote.resumeClass(id);
}
export async function advancePhase(id: string, currentPhase: SessionPhase) {
  return isRehearsal(id)
    ? updateRehearsal(id, null, { currentPhase, status: 'ACTIVE' })
    : remote.advancePhase(id, currentPhase);
}
export async function endClass(id: string) {
  return isRehearsal(id)
    ? updateRehearsal(id, null, { status: 'ENDED', currentPhase: 'ENDED' })
    : remote.endClass(id);
}
export async function touchLastActive(id: string, team: string) {
  return isRehearsal(id)
    ? updateRehearsal(id, team, { lastActiveAt: Date.now() })
    : remote.touchLastActive(id, team);
}
