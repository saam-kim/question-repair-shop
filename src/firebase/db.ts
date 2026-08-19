import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import { app } from './config';
import { createPokemonPool } from '../lib/pokemonNames';
import type {
  Session,
  SessionPhase,
  SessionStatus,
  Team,
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
  options?: string[];
  unit?: string;
}

let dbInstance: Firestore | null = null;

/**
 * Firestore 인스턴스를 실제로 필요한 시점에 생성한다.
 * 모듈 로드 시점에 즉시 getFirestore()를 호출하면 Firebase 설정값이 비어있을 때
 * 앱 전체 렌더링이 막히므로(빈 화면), 사용 시점까지 지연시킨다.
 */
export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(app);
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
    const existing = await getDoc(sessionDocRef(sessionId));
    if (existing.exists()) continue;

    const session: Session = {
      sessionCode: code,
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      createdAt: Date.now(),
      teacherUid,
      teamCounter: 0,
      pokemonPool: createPokemonPool(),
    };
    await setDoc(sessionDocRef(sessionId), session);
    return { sessionId, sessionCode: code };
  }
  throw new Error('세션 코드 생성에 실패했습니다. 다시 시도해주세요.');
}

export async function findSessionByCode(code: string): Promise<string | null> {
  const sessionId = `s${code}`;
  const snap = await getDoc(sessionDocRef(sessionId));
  return snap.exists() ? sessionId : null;
}

export async function joinOrCreateTeam(
  sessionId: string,
  uid: string,
): Promise<{ teamId: string; teamNumber: number; nickname: string }> {
  const sRef = sessionDocRef(sessionId);

  return runTransaction(getDb(), async (tx) => {
    const sSnap = await tx.get(sRef);
    const sessionData = sSnap.data() as Session | undefined;
    if (!sessionData) throw new Error('수업을 찾을 수 없습니다.');

    const teamNumber = (sessionData.teamCounter ?? 0) + 1;
    const teamId = `team${teamNumber}`;
    const pool = sessionData.pokemonPool ?? [];
    const nickname = pool[(teamNumber - 1) % pool.length] ?? `${teamNumber}조`;

    const team: Team = {
      teamNumber,
      nickname,
      ownerUid: uid,
      createdAt: Date.now(),
    };

    tx.update(sRef, { teamCounter: teamNumber });
    tx.set(teamDocRef(sessionId, teamId), team);

    return { teamId, teamNumber, nickname };
  });
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
      comment: feedback.comment,
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

export interface RevisionInput {
  originalText: string;
  revisedText: string;
  revisionReasons: RevisionReason[];
  scaleType: ScaleType;
  options?: string[];
  unit?: string;
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
  await updateDoc(sessionDocRef(sessionId), { currentPhase: nextPhase, status: 'ACTIVE' as SessionStatus });
}

export async function endClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'ENDED', currentPhase: 'ENDED' });
}

export async function touchLastActive(sessionId: string, teamId: string) {
  await updateDoc(teamDocRef(sessionId, teamId), { lastActiveAt: Date.now() });
}
