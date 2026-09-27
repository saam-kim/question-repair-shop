let reconnect: (() => Promise<void>) | undefined;
let pending: Promise<void> | undefined;
let lastAttempt = -Infinity;
const refreshListeners = new Set<() => void>();

export function onConnectionRefresh(listener: () => void) {
  refreshListeners.add(listener);
  return () => { refreshListeners.delete(listener); };
}

export function configureConnectionRecovery(handler: () => Promise<void>) {
  if (reconnect) return;
  reconnect = handler;
  window.addEventListener('online', () => { void recoverConnection().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void recoverConnection().catch(() => {});
  });
}

/** Restart the transport, not the user's write. Queued writes retain their identity. */
export function recoverConnection(): Promise<void> {
  if (pending) return pending;
  if (!reconnect || !navigator.onLine) return Promise.resolve();
  if (Date.now() - lastAttempt < 10000) {
    refreshListeners.forEach((listener) => listener());
    return Promise.resolve();
  }
  lastAttempt = Date.now();
  pending = reconnect().then(() => {
    refreshListeners.forEach((listener) => listener());
  }).finally(() => { pending = undefined; });
  return pending;
}

/** A slow acknowledgement is not a failed write: never submit a second copy. */
export async function withConnectionRecovery<T>(operation: Promise<T>): Promise<T> {
  const timer = window.setTimeout(() => { void recoverConnection().catch(() => {}); }, 8000);
  try { return await operation; }
  finally { window.clearTimeout(timer); }
}
