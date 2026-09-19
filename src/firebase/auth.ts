import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';
import { app, useEmulators } from './config';
let authInstance: Auth | null = null;
export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app);
    if (useEmulators)
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return authInstance;
}
export function getInitialUser(): User | null {
  return getAuthInstance().currentUser;
}
let anonAuthPromise: Promise<User> | null = null;
export function ensureAnonAuth(): Promise<User> {
  if (!anonAuthPromise) {
    anonAuthPromise = (async () => {
      const auth = getAuthInstance();
      await auth.authStateReady();
      return auth.currentUser ?? (await signInAnonymously(auth)).user;
    })().catch((error: unknown) => {
      anonAuthPromise = null;
      throw error;
    });
  }
  return anonAuthPromise;
}
