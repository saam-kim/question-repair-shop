import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getRehearsal, isRehearsal, subscribeRehearsal } from '../lib/rehearsalStore';
import { getDb, sessionDocRef } from '../firebase/db';
import type { Session, SessionData, Team } from '../types';

interface UseSessionResult {
  data: SessionData | null;
  loading: boolean;
  error: string | null;
}

/**
 * 세션 문서 + teams 서브컬렉션을 각각 실시간 구독해 하나로 합친다.
 * 교실 규모(수십 개 조 이하)에서는 teams 컬렉션 전체를 필터 없이 듣는 편이
 * 조별로 리스너를 따로 만드는 것보다 단순하고 충분히 저렴하다.
 */
export function useSession(
  sessionId: string | null,
  includeTeams = true,
  teacherUid?: string | null,
): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setTeams({});
      setSessionLoaded(false);
      setTeamsLoaded(false);
      return;
    }

    setSessionLoaded(false);
    setTeamsLoaded(false);

    setSession(null);
    setTeams({});
    setError(null);

    if (isRehearsal(sessionId)) {
      const update = () => {
        const demo = getRehearsal(sessionId);
        setSession(demo?.session ?? null);
        setTeams(demo?.teams ?? {});
        setSessionLoaded(true);
        setTeamsLoaded(true);
      };
      update();
      return subscribeRehearsal(sessionId, update);
    }
    let unsubTeams: (() => void) | undefined;
    const unsubSession = onSnapshot(
      sessionDocRef(sessionId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        const next = snap.exists() ? (snap.data() as Session) : null;
        setSession(next);
        setSessionLoaded(true);
        const canReadTeams =
          includeTeams &&
          next?.schemaVersion === 2 &&
          (!teacherUid || next.teacherUid === teacherUid);
        if (!canReadTeams) {
          unsubTeams?.();
          unsubTeams = undefined;
          setTeams({});
          setTeamsLoaded(true);
        } else if (!unsubTeams) {
          setTeamsLoaded(false);
          unsubTeams = onSnapshot(
            collection(getDb(), 'qrsSessions', sessionId, 'teams'),
            { includeMetadataChanges: true },
            (teamsSnap) => {
              if (teamsSnap.metadata.hasPendingWrites) return;
              const result: Record<string, Team> = {};
              teamsSnap.forEach((d) => {
                result[d.id] = d.data() as Team;
              });
              setTeams(result);
              setTeamsLoaded(true);
            },
            (err) => {
              setError(err.message);
              setTeamsLoaded(true);
            },
          );
        }
      },
      (err) => {
        setError(err.message);
        setSessionLoaded(true);
        setTeamsLoaded(true);
      },
    );
    return () => {
      unsubSession();
      unsubTeams?.();
    };
  }, [sessionId, includeTeams, teacherUid]);

  const loading = Boolean(sessionId) && (!sessionLoaded || !teamsLoaded);
  const data: SessionData | null =
    sessionId && session ? { session, teams, assignments: session.assignments ?? {} } : null;

  return { data, loading, error };
}
