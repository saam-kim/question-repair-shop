import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { app } from './config';

let authInstance: Auth | null = null;

function getAuthInstance(): Auth {
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

let anonAuthPromise: Promise<User> | null = null;

/**
 * 학생/교사 모두 로그인 UI 없이 백그라운드에서 익명 인증을 받는다.
 * RTDB 보안 규칙에서 "이 조는 자신의 데이터만 쓸 수 있다"를 검증하기 위한 최소한의 uid 확보 용도.
 * auth 인스턴스는 실제로 호출되는 시점(컴포넌트 마운트 후)에 생성해,
 * Firebase 설정값이 비어있어도 앱 셸 자체는 렌더링되도록 한다.
 */
export function ensureAnonAuth(): Promise<User> {
  if (anonAuthPromise) return anonAuthPromise;

  anonAuthPromise = new Promise<User>((resolve, reject) => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        }
      },
      reject,
    );
    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      reject(err);
    });
  });

  return anonAuthPromise;
}
