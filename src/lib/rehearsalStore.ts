import type { SessionData } from '../types';
import { applyConfirmedPatch } from './confirmedUpdates';

// Deliberately has no Firebase dependency. All demo activity is held in memory.
const sessions = new Map<string, SessionData>();
const listeners = new Map<string, Set<() => void>>();
export const isRehearsal = (id: string) => id.startsWith('demo:');

export function createRehearsal(): string {
  const id = `demo:${crypto.randomUUID()}`;
  if (sessions.size >= 16) sessions.delete(sessions.keys().next().value!);
  sessions.set(id, {
    session: {
      schemaVersion: 2,
      sessionCode: '연습',
      teacherUid: 'demo',
      createdAt: Date.now(),
      status: 'LOBBY',
      currentPhase: 'LOBBY',
      teamCounter: 4,
    },
    teams: Object.fromEntries(
      ['연두', '바다', '햇살', '노을'].map((nickname, i) => [
        `team${i + 1}`,
        { teamNumber: i + 1, nickname, ownerUid: `demo${i + 1}`, createdAt: Date.now() },
      ]),
    ),
    assignments: {},
  });
  return id;
}

export function getRehearsal(id: string) {
  return sessions.get(id) ?? null;
}
export function subscribeRehearsal(id: string, listener: () => void) {
  const set = listeners.get(id) ?? new Set();
  set.add(listener);
  listeners.set(id, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(id);
  };
}
export function closeRehearsal(id: string) {
  sessions.delete(id);
}

export async function updateRehearsal(
  id: string,
  teamId: string | null,
  changes: Record<string, unknown>,
) {
  const data = sessions.get(id);
  if (!data) throw new Error('리허설을 다시 열어주세요.');
  const target = teamId ? data.teams[teamId] : data.session;
  if (!target) throw new Error('연습용 조를 찾을 수 없습니다.');
  const next: SessionData = teamId
    ? { ...data, teams: { ...data.teams, [teamId]: applyConfirmedPatch(data.teams[teamId], changes) } }
    : { ...data, session: applyConfirmedPatch(data.session, changes) };
  next.assignments = next.session.assignments ?? {};
  sessions.set(id, next);
  listeners.get(id)?.forEach((fn) => fn());
}
