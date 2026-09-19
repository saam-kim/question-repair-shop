import { useEffect, useState } from 'react';

function matchesShape(value: unknown, initial: unknown): boolean {
  if (Array.isArray(initial))
    return (
      Array.isArray(value) &&
      (initial.length === 0 ||
        (value.length === initial.length &&
          initial.every((item, i) => matchesShape(value[i], item))))
    );
  if (initial !== null && typeof initial === 'object')
    return (
      value !== null &&
      typeof value === 'object' &&
      Object.entries(initial).every(([key, item]) =>
        matchesShape((value as Record<string, unknown>)[key], item),
      )
    );
  return typeof value === typeof initial;
}

/** Drafts stay on this device and are scoped to one session, team and activity. */
export function useLocalDraft<T>(
  key: string,
  initial: () => T,
  validate?: (value: unknown) => value is T,
) {
  const storageKey = `qrs_draft_v1_${key}`;
  const [value, setValue] = useState<T>(() => {
    const fallback = initial();
    if (key.includes('demo:')) return fallback;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      return (validate ? validate(saved) : matchesShape(saved, fallback)) ? (saved as T) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    if (key.includes('demo:')) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* Submission works even if local storage is unavailable. */
    }
  }, [storageKey, value, key]);
  function clear() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* No draft to clear. */
    }
  }
  return [value, setValue, clear] as const;
}
