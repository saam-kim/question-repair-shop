import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  connectFirestoreEmulator,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { app, useEmulators } from './config';
import { isSchoolNetworkMode } from '../lib/networkMode';
import { joinTeamTransaction } from './joinTeam';
import { createPokemonPool } from '../lib/pokemonNames';
import type {
  Session,
  SessionPhase,
  SessionStatus,
  QuestionId,
  ProblemType,
  RevisionReason,
  Assignments,
  ScaleType,
} from '../types';

/** Firestore는 필드값으로 undefined를 허용하지 않으므로, 없는 값은 키 자체를 뺀다. */
function withoutUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    if (obj[key] !== undefined) result[key] = obj[key];
  });
  return result;
}

export interface QuestionInput {
  text: string;
  scaleType: ScaleType;
  likertLabels?: string[];
  hasOtherOption?: boolean;
  unit?: string;
  options?: string[];
}

export interface RevisionInput {
  originalText: string;
  revisedText: string;
  revisionReasons: RevisionReason[];
  scaleType: ScaleType;
  likertLabels?: string[];
  hasOtherOption?: boolean;
  unit?: string;
  options?: string[];
}

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = isSchoolNetworkMode()
      ? initializeFirestore(app, { experimentalForceLongPolling: true })
      : getFirestore(app);
    if (useEmulators) connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  }
  return dbInstance;
}

export function sessionDocRef(sessionId: string) {
  return doc(getDb(), 'qrsSessions', sessionId);
}

export function teamDocRef(sessionId: string, teamId: string) {
  return doc(getDb(), 'qrsSessions', sessionId, 'teams', teamId);
}

function generateSessionCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

export async function createSession(
  teacherUid: string,
): Promise<{ sessionId: string; sessionCode: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateSessionCode();
    const sessionId = `s${code}`;
    const session: Session = {
      schemaVersion: 2,
      sessionCode: code,
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      createdAt: Date.now(),
      teacherUid,
      teamCounter: 0,
      pokemonPool: createPokemonPool(),
    };
    let created: boolean;
    try {
      created = await runTransaction(getDb(), async (tx) => {
        const ref = sessionDocRef(sessionId);
        if ((await tx.get(ref)).exists()) return false;
        tx.set(ref, session);
        return true;
      });
    } catch (error) {
      if (
        (error as { code?: string }).code === 'permission-denied' &&
        (await getDoc(sessionDocRef(sessionId))).exists()
      )
        continue;
      throw error;
    }
    if (!created) continue;
    return { sessionId, sessionCode: code };
  }
  throw new Error('세션 코드 생성에 실패했습니다. 다시 시도해주세요.');
}

export async function findSessionByCode(code: string): Promise<string | null> {
  const sessionId = `s${code}`;
  const snap = await getDoc(sessionDocRef(sessionId));
  return snap.exists() ? sessionId : null;
}

/**
 * 학생이 수업에 참여할 때 조를 찾거나 생성한다.
 * 동시 접속 30~40명 환경에서 트랜잭션 충돌 시 자동 재시도하며,
 * 이미 참여 중인 uid가 있으면 기존 조 정보를 재사용한다.
 */
const pendingJoins = new Map<
  string,
  Promise<{ teamId: string; teamNumber: number; nickname: string }>
>();

export function joinOrCreateTeam(sessionId: string, uid: string) {
  const key = sessionId + ':' + uid;
  const pending = pendingJoins.get(key);
  if (pending) return pending;
  const request = joinOrCreateTeamOnce(sessionId, uid).finally(() => pendingJoins.delete(key));
  pendingJoins.set(key, request);
  return request;
}

async function joinOrCreateTeamOnce(
  sessionId: string,
  uid: string,
): Promise<{ teamId: string; teamNumber: number; nickname: string }> {
  const db = getDb();

  return joinTeamTransaction(db, sessionId, uid, useEmulators);
}

export async function setTeamTopic(sessionId: string, teamId: string, topic: string) {
  await updateDoc(teamDocRef(sessionId, teamId), { topic });
}

export async function submitQuestions(
  sessionId: string,
  teamId: string,
  questions: Record<QuestionId, QuestionInput>,
) {
  const now = Date.now();
  const payload: Record<string, unknown> = {
    questionsSubmittedAt: now,
  };
  (Object.keys(questions) as QuestionId[]).forEach((qid, idx) => {
    const q = questions[qid];
    payload[`questions.${qid}`] = withoutUndefined({
      text: q.text,
      scaleType: q.scaleType,
      likertLabels: q.likertLabels,
      hasOtherOption: q.hasOtherOption,
      options: q.options,
      unit: q.unit,
      order: idx + 1,
      createdAt: now,
    });
  });
  await updateDoc(teamDocRef(sessionId, teamId), payload);
}

export async function writeAssignments(sessionId: string, assignments: Assignments) {
  await updateDoc(sessionDocRef(sessionId), { assignments });
}

export async function submitResponseAndFeedback(
  sessionId: string,
  myTeamId: string,
  targetTeamId: string,
  questionId: QuestionId,
  value: number | string,
  feedback: { problemTypes: ProblemType[]; comment: string },
) {
  const now = Date.now();
  const payload: Record<string, unknown> = {
    [`responsesGiven.${targetTeamId}.${questionId}`]: { value, respondedAt: now },
    [`feedbackGiven.${targetTeamId}.${questionId}`]: {
      problemTypes: feedback.problemTypes,
      comment: feedback.comment || '',
      createdAt: now,
    },
  };
  await updateDoc(teamDocRef(sessionId, myTeamId), payload);
}

export async function markRespondingDone(
  sessionId: string,
  myTeamId: string,
  targetTeamId: string,
) {
  await updateDoc(teamDocRef(sessionId, myTeamId), {
    [`respondingProgress.${targetTeamId}`]: 'DONE',
  });
}

export async function submitRevisions(
  sessionId: string,
  teamId: string,
  revisions: Record<QuestionId, RevisionInput>,
) {
  const now = Date.now();
  const payload: Record<string, unknown> = {
    revisionsSubmittedAt: now,
  };
  (Object.keys(revisions) as QuestionId[]).forEach((qid) => {
    payload[`revisions.${qid}`] = withoutUndefined({ ...revisions[qid], createdAt: now });
  });
  await updateDoc(teamDocRef(sessionId, teamId), payload);
}

export async function startClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'ACTIVE', currentPhase: 'QUESTION' });
}

export async function pauseClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'PAUSED' });
}

export async function resumeClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'ACTIVE' });
}

export async function advancePhase(sessionId: string, nextPhase: SessionPhase) {
  await updateDoc(sessionDocRef(sessionId), {
    currentPhase: nextPhase,
    status: 'ACTIVE' as SessionStatus,
  });
}

export async function endClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'ENDED', currentPhase: 'ENDED' });
}

export async function touchLastActive(sessionId: string, teamId: string) {
  await updateDoc(teamDocRef(sessionId, teamId), { lastActiveAt: Date.now() });
}

export async function listTeacherSessions(uid: string) {
  const result = await getDocs(
    query(collection(getDb(), 'qrsSessions'), where('teacherUid', '==', uid)),
  );
  return result.docs
    .map((d) => ({ id: d.id, ...(d.data() as Session) }))
    .filter((s) => s.schemaVersion === 2)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Ended classes are frozen; delete all team records and their parent atomically. */
export async function deleteSession(sessionId: string) {
  const ref = sessionDocRef(sessionId);
  const snap = await getDoc(ref);
  if (snap.data()?.status !== 'ENDED') throw new Error('수업을 먼저 종료해주세요.');
  const teams = await getDocs(collection(getDb(), 'qrsSessions', sessionId, 'teams'));
  const batch = writeBatch(getDb());
  teams.forEach((team) => batch.delete(team.ref));
  batch.delete(ref);
  await batch.commit();
}
