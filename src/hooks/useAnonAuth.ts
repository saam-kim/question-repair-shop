import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureAnonAuth, getInitialUser } from '../firebase/auth';
import { authErrorMessage } from '../lib/authErrorMessage';

export function useAnonAuth() {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ensureAnonAuth()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch((reason) => {
        if (!cancelled) setError(authErrorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  return { uid: user?.uid ?? null, loading: !user && !error, error, retry };
}
