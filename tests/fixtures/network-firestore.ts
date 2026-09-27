import { applyConfirmedPatch } from '../../src/lib/confirmedUpdates';

type Listener = (snapshot: ReturnType<typeof snapshot>) => void;
export const state = {
  docs: {
    'qrsSessions/s123456': { schemaVersion: 2, sessionCode: '123456', teacherUid: 'teacher', status: 'ACTIVE', currentPhase: 'QUESTION', createdAt: 1 },
    'qrsSessions/s123456/teams/student': { teamNumber: 1, nickname: '연두', ownerUid: 'student', createdAt: 1 },
  } as Record<string, Record<string, unknown>>,
  pending: [] as { path: string; patch: Record<string, unknown>; resolve: () => void; reject: (error: Error) => void }[],
  writes: 0,
  reconnects: 0,
  reads: 0,
  holdReads: false,
  delayedReads: [] as (() => void)[],
  listeners: new Map<string, Set<Listener>>(),
  acknowledge() {
    const write = this.pending.shift();
    if (!write) throw new Error('No pending write');
    this.docs[write.path] = applyConfirmedPatch(this.docs[write.path], write.patch);
    write.resolve(); // Intentionally omit the snapshot update.
  },
};
function snapshot(path: string, fromCache = false) {
  const value = structuredClone(state.docs[path]);
  return {
    id: path.split('/').at(-1), exists: () => Boolean(value), data: () => value,
    metadata: { fromCache, hasPendingWrites: false },
    docs: Object.keys(state.docs).filter((key) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1)
      .map((key) => ({ id: key.split('/').at(-1), data: () => structuredClone(state.docs[key]) })),
  };
}
export const initializeFirestore = () => ({});
export const getFirestore = initializeFirestore;
export const connectFirestoreEmulator = () => {};
export const doc = (_db: unknown, ...parts: string[]) => parts.join('/');
export const collection = doc;
export const disableNetwork = async () => { state.reconnects++; };
export const enableNetwork = async () => {};
export function onSnapshot(path: string, _options: unknown, listener: Listener) {
  const list = state.listeners.get(path) ?? new Set<Listener>();
  state.listeners.set(path, list);
  list.add(listener);
  queueMicrotask(() => { if (list.has(listener)) listener(snapshot(path)); });
  return () => { list.delete(listener); };
}
export const getDoc = async (path: string) => snapshot(path);
export const getDocs = getDoc;
export const getDocsFromServer = getDoc;
export async function runTransaction(_db: unknown, callback: (tx: { get: typeof getDoc }) => unknown) {
  state.reads++;
  const result = await callback({ get: getDoc });
  if (state.holdReads) await new Promise<void>((resolve) => { state.delayedReads.push(resolve); });
  return result;
}
export function updateDoc(path: string, patch: Record<string, unknown>) {
  state.writes++;
  return new Promise<void>((resolve, reject) => { state.pending.push({ path, patch, resolve, reject }); });
}
export const query = (ref: string) => ref;
export const where = () => ({});
export const writeBatch = () => ({ delete() {}, async commit() {} });
export function emitCache(path: string) {
  state.listeners.get(path)?.forEach((listener) => listener(snapshot(path, true)));
}
