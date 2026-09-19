import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';
import type { Session, Team } from '../types';

export async function joinTeamTransaction(
  db: Firestore,
  sessionId: string,
  uid: string,
  retryEmulatorConflicts = false,
) {
  const sRef = doc(db, 'qrsSessions', sessionId);
  // One document per identity prevents duplicates across concurrent tabs.
  const maxAttempts = retryEmulatorConflicts ? 24 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await runTransaction(
        db,
        async (tx) => {
          const sSnap = await tx.get(sRef);
          const sessionData = sSnap.data() as Session | undefined;
          if (!sessionData) throw new Error('수업을 찾을 수 없습니다.');
          if (sessionData.schemaVersion !== 2)
            throw new Error('이전 버전의 수업입니다. 선생님께 새 수업 코드를 받아주세요.');
          const tRef = doc(db, 'qrsSessions', sessionId, 'teams', uid);
          const existing = await tx.get(tRef);
          if (existing.exists()) {
            const team = existing.data() as Team;
            return { teamId: uid, teamNumber: team.teamNumber, nickname: team.nickname };
          }
          if (sessionData.status === 'ENDED') throw new Error('이미 종료된 수업입니다.');
          if (
            !['LOBBY', 'QUESTION'].includes(sessionData.currentPhase) ||
            sessionData.status === 'PAUSED'
          ) {
            throw new Error('응답 배정 이후에는 새로 입장할 수 없습니다. 선생님께 문의해주세요.');
          }
          if ((sessionData.teamCounter ?? 0) >= 40)
            throw new Error('한 수업에는 최대 40개 조가 참여할 수 있습니다.');
          const teamNumber = (sessionData.teamCounter ?? 0) + 1;
          const pool = sessionData.pokemonPool ?? [];
          const nickname = pool[(teamNumber - 1) % pool.length] ?? `${teamNumber}조`;
          const team: Team = { teamNumber, nickname, ownerUid: uid, createdAt: Date.now() };
          tx.update(sRef, { teamCounter: teamNumber });
          tx.set(tRef, team);
          return { teamId: uid, teamNumber, nickname };
        },
        { maxAttempts: 20 },
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (
        attempt === maxAttempts - 1 ||
        ![
          'aborted',
          'unavailable',
          ...(retryEmulatorConflicts ? ['permission-denied'] : []),
        ].includes(code ?? '')
      )
        throw error;
      // Some emulator versions report a contended rules read as permission-denied.
      // Recheck the session before a bounded retry; never relax server permissions.
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(2500, 300 * 2 ** attempt) * (0.5 + Math.random())),
      );
      const fresh = await getDoc(sRef);
      const latest = fresh.data() as Session | undefined;
      if (
        !latest ||
        latest.schemaVersion !== 2 ||
        !['LOBBY', 'ACTIVE'].includes(latest.status) ||
        !['LOBBY', 'QUESTION'].includes(latest.currentPhase)
      )
        throw error;
    }
  }
  throw new Error('동시 입장이 많습니다. 잠시 후 다시 입장해주세요.');
}
