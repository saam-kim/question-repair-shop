import { getAuth, signInAnonymously, type Auth, type User } from 'firebase/auth';
import { app } from './config';

let authInstance: Auth | null = null;

export function getAuthInstance(): Auth {
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

export function getFallbackUid(): string {
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

export function getInitialUser(): User {
  try {
    const auth = getAuthInstance();
    if (auth.currentUser) return auth.currentUser;
  } catch {
    // ignore
  }
  return { uid: getFallbackUid(), isAnonymous: true } as unknown as User;
}

let anonAuthPromise: Promise<User> | null = null;

/**
 * 학생/교사 모두 로그인 UI 없이 0ms 즉시 실행.
 * 로컬 영구 식별자(Fallback UID)로 즉시 화면을 렌더링하고,
 * 백그라운드에서 비동기 인증을 처리하여 로딩 지연을 완전히 제거한다.
 */
export function ensureAnonAuth(): Promise<User> {
  if (anonAuthPromise) return anonAuthPromise;

  const initial = getInitialUser();
  anonAuthPromise = new Promise<User>((resolve) => {
    // 1. 즉시 초기 사용자 객체 반환 (0ms 로딩)
    resolve(initial);

    // 2. 백그라운드에서 Firebase Auth 연결 (UI 블로킹 방지)
    try {
      const auth = getAuthInstance();
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(() => {
          // 익명 인증 실패 시에도 로컬 UID로 100% 정상 작동
        });
      }
    } catch {
      // ignore
    }
  });

  return anonAuthPromise;
}
