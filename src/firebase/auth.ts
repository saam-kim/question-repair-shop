import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { app } from './config';

let authInstance: Auth | null = null;

function getAuthInstance(): Auth {
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

function getFallbackUid(): string {
  try {
    let uid = localStorage.getItem('qrs_client_uid');
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('qrs_client_uid', uid);
    }
    return uid;
  } catch {
    return 'usr_' + Math.random().toString(36).slice(2, 10);
  }
}

let anonAuthPromise: Promise<User> | null = null;

/**
 * 학생/교사 모두 로그인 UI 없이 백그라운드에서 익명 인증을 받는다.
 * 학교 와이파이 방화벽이나 Auth 미설정 상태에서도 수업이 멈추지 않도록
 * 실패 시 로컬 영구 식별자(Fallback UID)로 즉시 전환한다.
 */
export function ensureAnonAuth(): Promise<User> {
  if (anonAuthPromise) return anonAuthPromise;

  anonAuthPromise = new Promise<User>((resolve) => {
    try {
      const auth = getAuthInstance();
      if (auth.currentUser) {
        return resolve(auth.currentUser);
      }

      let timeoutId: ReturnType<typeof setTimeout>;

      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(user);
          }
        },
        () => {
          // 리스너 에러 시 폴백
          clearTimeout(timeoutId);
          unsubscribe();
          resolve({ uid: getFallbackUid(), isAnonymous: true } as unknown as User);
        },
      );

      // 4초 내에 응답 없거나 에러 시 폴백 전환
      timeoutId = setTimeout(() => {
        unsubscribe();
        resolve({ uid: getFallbackUid(), isAnonymous: true } as unknown as User);
      }, 4000);

      signInAnonymously(auth).catch(() => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve({ uid: getFallbackUid(), isAnonymous: true } as unknown as User);
      });
    } catch {
      resolve({ uid: getFallbackUid(), isAnonymous: true } as unknown as User);
    }
  });

  return anonAuthPromise;
}
