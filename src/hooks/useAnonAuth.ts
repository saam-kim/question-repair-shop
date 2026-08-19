import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureAnonAuth } from '../firebase/auth';

export function useAnonAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureAnonAuth()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { uid: user?.uid ?? null, loading: !user && !error, error };
}
