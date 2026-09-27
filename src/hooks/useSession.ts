import { useEffect, useState } from 'react';
import { collection, getDocsFromServer, onSnapshot, runTransaction } from 'firebase/firestore';
import { getRehearsal, isRehearsal, subscribeRehearsal } from '../lib/rehearsalStore';
import { getDb, sessionDocRef } from '../firebase/db';
import { applyConfirmedPatch, onConfirmedUpdate } from '../lib/confirmedUpdates';
import { onConnectionRefresh, withConnectionRecovery } from '../lib/connectionRecovery';
import type { Session, SessionData, Team } from '../types';

export function useSession(sessionId: string | null, includeTeams = true, teacherUid?: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null);
    setTeams({});
    setSessionLoaded(false);
    setTeamsLoaded(false);
    setError(null);
    if (!sessionId) return;
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

    let active = true;
    let currentSession: Session | null = null;
    let sessionVersion = 0;
    let teamsVersion = 0;
    let reading = false;
    let readingTeams = false;
    let haveTeams = false;
    let unsubSession: (() => void) | undefined;
    let unsubTeams: (() => void) | undefined;
    let retryTimer: number | undefined;
    const db = getDb();
    const sRef = sessionDocRef(sessionId);
    const tRef = collection(db, 'qrsSessions', sessionId, 'teams');
    const canReadTeams = () => includeTeams && currentSession?.schemaVersion === 2 &&
      (!teacherUid || currentSession.teacherUid === teacherUid);

    function failed(reason: unknown) {
      if (!active) return;
      const code = (reason as { code?: string }).code;
      if (code === 'permission-denied' || code === 'unauthenticated') {
        setError('수업 접근 권한을 확인하지 못했습니다. 다시 연결해주세요.');
        setSessionLoaded(true);
        setTeamsLoaded(true);
      } else if (!retryTimer) {
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined;
          startListeners();
        }, 5000);
      }
    }

    function acceptSession(next: Session | null) {
      currentSession = next;
      sessionVersion++;
      setSession(next);
      setSessionLoaded(true);
      setError(null);
      if (!canReadTeams()) {
        unsubTeams?.();
        unsubTeams = undefined;
        setTeams({});
        setTeamsLoaded(true);
      } else if (!unsubTeams) {
        unsubTeams = onSnapshot(tRef, { includeMetadataChanges: true }, (snapshot) => {
          if (!active || snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
          teamsVersion++;
          haveTeams = true;
          setTeams(Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data() as Team])));
          setTeamsLoaded(true);
          setError(null);
        }, failed);
      }
    }

    function startListeners() {
      if (!active) return;
      unsubSession?.();
      unsubTeams?.();
      unsubTeams = undefined;
      unsubSession = onSnapshot(sRef, { includeMetadataChanges: true }, (snapshot) => {
        if (!active || snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
        acceptSession(snapshot.exists() ? snapshot.data() as Session : null);
      }, failed);
    }

    async function refreshTeams() {
      if (!active || !canReadTeams() || readingTeams) return;
      readingTeams = true;
      const version = teamsVersion;
      try {
        const snapshot = await withConnectionRecovery(getDocsFromServer(tRef));
        if (active && version === teamsVersion) {
          haveTeams = true;
          teamsVersion++;
          setTeams(Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data() as Team])));
          setTeamsLoaded(true);
        }
      } catch (reason) { failed(reason); }
      finally { readingTeams = false; }
    }

    async function refresh(full = false) {
      if (!active || reading || !navigator.onLine || document.visibilityState === 'hidden') return;
      reading = true;
      const version = sessionVersion;
      try {
        // Independent server request: a stalled Listen stream must not freeze the class phase.
        const snapshot = await withConnectionRecovery(runTransaction(db, (tx) => tx.get(sRef), { maxAttempts: 1 }));
        if (!active || version !== sessionVersion) return;
        const next = snapshot.exists() ? snapshot.data() as Session : null;
        const changedPhase = next?.currentPhase !== currentSession?.currentPhase;
        acceptSession(next);
        if (full || changedPhase || !haveTeams) void refreshTeams();
      } catch (reason) { failed(reason); }
      finally { reading = false; }
    }

    const stopConfirmed = onConfirmedUpdate((update) => {
      if (update.sessionId !== sessionId || !active) return;
      if (update.teamId) {
        teamsVersion++;
        const id = update.teamId;
        setTeams((previous) => previous[id]
          ? { ...previous, [id]: applyConfirmedPatch(previous[id], update.patch) }
          : previous);
      } else if (currentSession) {
        acceptSession(applyConfirmedPatch(currentSession, update.patch));
      }
    });
    const stopRefresh = onConnectionRefresh(() => {
      startListeners();
      void refresh(true);
    });
    startListeners();
    const initialFallback = window.setTimeout(() => { void refresh(true); }, 4000);
    // Poll only the small session document; team queries run during recovery/phase changes.
    const interval = window.setInterval(() => {
      if (currentSession?.status !== 'ENDED') void refresh();
    }, 15000 + Math.floor(Math.random() * 3000));
    return () => {
      active = false;
      unsubSession?.();
      unsubTeams?.();
      stopConfirmed();
      stopRefresh();
      window.clearTimeout(retryTimer);
      window.clearTimeout(initialFallback);
      window.clearInterval(interval);
    };
  }, [sessionId, includeTeams, teacherUid]);

  const data: SessionData | null = sessionId && session
    ? { session, teams, assignments: session.assignments ?? {} } : null;
  return { data, loading: Boolean(sessionId) && (!sessionLoaded || !teamsLoaded), error };
}
