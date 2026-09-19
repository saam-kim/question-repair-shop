import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureAnonAuth, getInitialUser } from '../firebase/auth';

export function useAnonAuth() {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureAnonAuth()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled)
          setError('기기 인증에 실패했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { uid: user?.uid ?? null, loading: !user && !error, error };
}
