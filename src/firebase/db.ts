import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
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

/**
 * 학생이 수업에 참여할 때 조를 찾거나 생성한다.
 * 동시 접속 30~40명 환경에서 트랜잭션 충돌 시 자동 재시도하며,
 * 이미 참여 중인 uid가 있으면 기존 조 정보를 재사용한다.
 */
export async function joinOrCreateTeam(
  sessionId: string,
  uid: string,
): Promise<{ teamId: string; teamNumber: number; nickname: string }> {
  const db = getDb();
  const sRef = sessionDocRef(sessionId);

  // 1. 이미 해당 세션에 참여한 팀이 있는지 확인
  try {
    const teamsSnap = await getDocs(collection(db, 'qrsSessions', sessionId, 'teams'));
    for (const d of teamsSnap.docs) {
      const data = d.data() as Team;
      if (data.ownerUid === uid) {
        return {
          teamId: d.id,
          teamNumber: data.teamNumber,
          nickname: data.nickname,
        };
      }
    }
  } catch {
    // 조회 실패 시 새 조 생성으로 진행
  }

  // 2. 동시 접속 충돌 대비 트랜잭션 재시도 루프
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await runTransaction(db, async (tx) => {
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
    } catch (err) {
      lastError = err;
      // 짧은 랜덤 지연 후 재시도
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    }
  }

  throw lastError ?? new Error('조 배정에 실패했습니다. 다시 시도해주세요.');
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
  await updateDoc(sessionDocRef(sessionId), { currentPhase: nextPhase, status: 'ACTIVE' as SessionStatus });
}

export async function endClass(sessionId: string) {
  await updateDoc(sessionDocRef(sessionId), { status: 'ENDED', currentPhase: 'ENDED' });
}

export async function touchLastActive(sessionId: string, teamId: string) {
  await updateDoc(teamDocRef(sessionId, teamId), { lastActiveAt: Date.now() });
}
