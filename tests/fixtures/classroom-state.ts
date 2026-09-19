import { useEffect, useSyncExternalStore } from 'react';
import type { SessionData, Team } from '../../src/types';
import { getRehearsal, isRehearsal, subscribeRehearsal } from '../../src/lib/rehearsalStore';

const sampleTeam = (number: number): Team => ({
  teamNumber: number,
  nickname: ['연두', '여울', '다온', '나래', '이음', '소담'][number - 1],
  ownerUid: `student${number}`,
  createdAt: 1,
  topic: '학생들의 학교생활 만족도',
  questions: {
    q1: { text: '학교 급식의 양은 충분한가요?', order: 1, createdAt: 1, scaleType: 'YES_NO' },
    q2: { text: '학교생활에 얼마나 만족하나요?', order: 2, createdAt: 1, scaleType: 'LIKERT_5' },
    q3: {
      text: '우리 학교에서 바꾸고 싶은 점은 무엇인가요?',
      order: 3,
      createdAt: 1,
      scaleType: 'ESSAY',
    },
  },
  ...(number < 5 ? { questionsSubmittedAt: 1 } : {}),
});
const sampleData: SessionData = {
  session: {
    schemaVersion: 2,
    sessionCode: '123456',
    teacherUid: 'teacher',
    createdAt: 1,
    status: 'ACTIVE',
    currentPhase: 'QUESTION',
  },
  teams: Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => ['team' + n, sampleTeam(n)])),
};
const storageKey = 'qrs_preview_classrooms_v1';
let sessions: Record<string, SessionData> = { s123456: sampleData };
let activeSessionId = 's123456';
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  if (saved?.sessions && saved.sessions[saved.activeSessionId]?.session?.schemaVersion === 2) {
    sessions = saved.sessions;
    activeSessionId = saved.activeSessionId;
  }
} catch { /* A fresh preview can still run without browser storage. */ }
let uid = 'teacher';
let error: string | null = null;
let revision = 0;
const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
const getRevision = () => revision;
function emit() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ sessions, activeSessionId }));
  } catch { /* Keep the preview usable when storage is unavailable. */ }
  revision++;
  listeners.forEach((fn) => fn());
}
export const state = {
  get data() {
    return sessions[activeSessionId];
  },
  get sessionId() { return activeSessionId; },
  getSession(id: string) { return sessions[id] ?? null; },
  listSessions(owner: string) {
    return Object.entries(sessions)
      .filter(([, data]) => data.session.teacherUid === owner)
      .map(([id, data]) => ({ id, ...data.session }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  selectSession(id: string) { if (sessions[id]) activeSessionId = id; },
  createSession(owner: string) {
    let code: string;
    do { code = String(Math.floor(Math.random() * 900000) + 100000); }
    while (sessions[`s${code}`]);
    const id = `s${code}`;
    sessions[id] = {
      session: { schemaVersion: 2, sessionCode: code, teacherUid: owner,
        createdAt: Date.now(), status: 'LOBBY', currentPhase: 'LOBBY', teamCounter: 0 },
      teams: {}, assignments: {},
    };
    activeSessionId = id;
    emit();
    return { sessionId: id, sessionCode: code };
  },
  deleteSession(id: string) { delete sessions[id]; emit(); },
  update(id: string, teamId: string | null, changes: Record<string, unknown>) {
    const data = structuredClone(sessions[id]);
    if (!data) throw new Error('수업을 찾을 수 없습니다.');
    const target = (teamId ? data.teams[teamId] : data.session) as unknown as Record<string, unknown>;
    if (!target) throw new Error('입장한 조를 찾을 수 없습니다.');
    for (const [path, value] of Object.entries(changes)) {
      const keys = path.split('.');
      let node = target;
      for (const key of keys.slice(0, -1)) {
        node[key] ??= {};
        node = node[key] as Record<string, unknown>;
      }
      node[keys.at(-1)!] = value;
    }
    data.assignments = data.session.assignments ?? {};
    sessions[id] = data;
    emit();
  },
  get uid() {
    return uid;
  },
  calls: [] as { name: string; args: unknown[] }[],
  failNext: false,
  patch(patch: Partial<SessionData['session']>, id = activeSessionId) {
    const data = sessions[id];
    if (!data) throw new Error('수업을 찾을 수 없습니다.');
    sessions[id] = { ...data, session: { ...data.session, ...patch } };
    emit();
  },
  setTeams(teams: Record<string, Team>, id = activeSessionId) {
    sessions[id] = { ...sessions[id], teams };
    emit();
  },
  setUid(value: string) {
    uid = value;
    emit();
  },
  setError(value: string | null) {
    error = value;
    emit();
  },
  record(name: string, args: unknown[]) {
    if (this.failNext) {
      this.failNext = false;
      throw Error('테스트 연결 오류');
    }
    this.calls.push({ name, args });
  },
};
export function useAnonAuth() {
  useSyncExternalStore(subscribe, getRevision);
  return { uid, loading: false, error: null };
}
export function useSession(sessionId: string | null) {
  useSyncExternalStore(subscribe, getRevision);
  useEffect(() => { if (sessionId) state.selectSession(sessionId); }, [sessionId]);
  const demo = useSyncExternalStore(
    (listener) => sessionId && isRehearsal(sessionId)
      ? subscribeRehearsal(sessionId, listener)
      : () => {},
    () => sessionId && isRehearsal(sessionId) ? getRehearsal(sessionId) : null,
  );
  if (sessionId && isRehearsal(sessionId)) return { data: demo, loading: false, error: null };
  return { data: sessionId ? state.getSession(sessionId) : null, loading: false, error };
}
