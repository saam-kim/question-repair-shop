export interface ConfirmedUpdate {
  sessionId: string;
  teamId: string | null;
  patch: Record<string, unknown>;
}
const listeners = new Set<(update: ConfirmedUpdate) => void>();
export function onConfirmedUpdate(listener: (update: ConfirmedUpdate) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function publishConfirmedUpdate(update: ConfirmedUpdate) {
  listeners.forEach((listener) => listener(update));
}
/** Firestore updateDoc patches may contain dotted field paths. Preserve sibling answers. */
export function applyConfirmedPatch<T extends object>(original: T, patch: Record<string, unknown>): T {
  const result = { ...original } as Record<string, unknown>;
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.');
    let target = result;
    for (const key of keys.slice(0, -1)) {
      target[key] = { ...(target[key] as Record<string, unknown> | undefined) };
      target = target[key] as Record<string, unknown>;
    }
    target[keys[keys.length - 1]] = value;
  }
  return result as T;
}
