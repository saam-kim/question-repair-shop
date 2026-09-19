import { state } from './classroom-state';
import type { Assignments, QuestionId, ProblemType } from '../../src/types';
import type { QuestionInput, RevisionInput } from '../../src/firebase/firestoreDb';
export const getDb = () => { throw new Error('Preview must not access Firestore'); };
export const teamDocRef = (id: string, team: string) => `${id}/${team}`;
export async function touchLastActive(...args: unknown[]) { state.record('touch', args); }
export const sessionDocRef = (id: string) => id;
export const getDoc = async (id: string) => {
  const data = state.getSession(id);
  return { exists: () => Boolean(data), data: () => data?.session };
};
export async function createSession(uid: string) {
  state.record('create', [uid]);
  return state.createSession(uid);
}
export const findSessionByCode = async (code: string) => state.getSession(`s${code}`) ? `s${code}` : null;
export async function joinOrCreateTeam(id: string, uid: string) {
  state.record('join', [id, uid]);
  const data = state.getSession(id);
  if (!data) throw new Error('수업을 찾을 수 없습니다.');
  if (data.session.status === 'ENDED') throw new Error('이미 종료된 수업입니다.');
  const existing = Object.entries(data.teams).find(([, team]) => team.ownerUid === uid);
  if (existing) return { teamId: existing[0], ...existing[1] };
  if (!['LOBBY', 'QUESTION'].includes(data.session.currentPhase))
    throw new Error('응답 배정 이후에는 새 조로 입장할 수 없습니다.');
  const number = Math.max(0, ...Object.values(data.teams).map((team) => team.teamNumber)) + 1;
  if (number > 40) throw new Error('최대 40개 조까지 입장할 수 있습니다.');
  const teamId = uid;
  const team = { teamNumber: number, nickname: `연습 ${number}조`, ownerUid: uid, createdAt: Date.now() };
  state.setTeams({ ...data.teams, [teamId]: team }, id);
  state.patch({ teamCounter: number }, id);
  return { teamId, ...team };
}
export async function startClass(id: string) {
  state.record('start', [id]);
  state.patch({ status: 'ACTIVE', currentPhase: 'QUESTION' }, id);
}
export async function pauseClass(id: string) {
  state.record('pause', [id]);
  state.patch({ status: 'PAUSED' }, id);
}
export async function resumeClass(id: string) {
  state.record('resume', [id]);
  state.patch({ status: 'ACTIVE' }, id);
}
export async function endClass(id: string) {
  state.record('end', [id]);
  state.patch({ status: 'ENDED', currentPhase: 'ENDED' }, id);
}
export async function advancePhase(id: string, phase: typeof state.data.session.currentPhase) {
  state.record('advance', [id, phase]);
  state.patch({ currentPhase: phase }, id);
}
export async function writeAssignments(id: string, assignments: Assignments) {
  state.record('assign', [id, assignments]);
  state.update(id, null, { assignments });
}
export async function setTeamTopic(id: string, team: string, topic: string) {
  state.record('topic', [id, team, topic]);
  state.update(id, team, { topic });
}
export async function submitQuestions(id: string, team: string, questions: Record<QuestionId, QuestionInput>) {
  state.record('questions', [id, team, questions]);
  const now = Date.now();
  state.update(id, team, {
    questionsSubmittedAt: now,
    questions: Object.fromEntries(Object.entries(questions).map(([key, question], i) =>
      [key, { ...question, order: i + 1, createdAt: now }],
    )),
  });
}
export async function submitRevisions(id: string, team: string, revisions: Record<QuestionId, RevisionInput>) {
  state.record('revisions', [id, team, revisions]);
  const now = Date.now();
  state.update(id, team, { revisionsSubmittedAt: now, revisions: Object.fromEntries(
    Object.entries(revisions).map(([key, revision]) => [key, { ...revision, createdAt: now }]),
  ) });
}
export async function submitResponseAndFeedback(
  id: string, team: string, target: string, qid: QuestionId, value: number | string,
  feedback: { problemTypes: ProblemType[]; comment: string },
) {
  state.record('response', [id, team, target, qid, value, feedback]);
  state.update(id, team, {
    [`responsesGiven.${target}.${qid}`]: { value, respondedAt: Date.now() },
    [`feedbackGiven.${target}.${qid}`]: { ...feedback, createdAt: Date.now() },
  });
}
export async function markRespondingDone(id: string, team: string, target: string) {
  state.record('done', [id, team, target]);
  state.update(id, team, { [`respondingProgress.${target}`]: 'DONE' });
}

export async function listTeacherSessions(uid: string) {
  return state.listSessions(uid);
}
export async function deleteSession(id: string) {
  state.record('delete', [id]);
  state.deleteSession(id);
}
