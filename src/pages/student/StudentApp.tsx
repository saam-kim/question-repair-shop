import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { useSession } from '../../hooks/useSession';
import { studentStorage } from '../../lib/storage';
import { StudentTopBar } from '../../components/StudentTopBar';
import { PausedOverlay } from '../../components/PausedOverlay';
import { LoadingScreen } from '../../components/LoadingScreen';
import { phaseStepLabel } from '../../lib/phases';
import { StudentPhaseContent } from './StudentPhaseContent';
import { joinOrCreateTeam } from '../../firebase/db';

export function StudentApp() {
  const { sessionId = '' } = useParams();
  return <StudentSessionApp key={sessionId} sessionId={sessionId} />;
}

interface StudentSessionAppProps {
  sessionId: string;
}

function StudentSessionApp({ sessionId }: StudentSessionAppProps) {
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAnonAuth();
  const { data, loading } = useSession(uid ? sessionId : null);

  const [teamId, setTeamId] = useState<string | null>(() => {
    const stored = studentStorage.read();
    return stored?.sessionId === sessionId ? stored.teamId : null;
  });
  const [joining, setJoining] = useState(false);
  const joiningSessionRef = useRef<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !data || teamId || joinError || joining || joiningSessionRef.current === sessionId || data.session.status === 'ENDED') return;

    let cancelled = false;
    joiningSessionRef.current = sessionId;
    setJoining(true);
    joinOrCreateTeam(sessionId, uid)
      .then(({ teamId: newTeamId }) => {
        if (cancelled) return;
        studentStorage.write({ sessionId, teamId: newTeamId, sessionCode: data.session.sessionCode });
        setTeamId(newTeamId);
      })
      .catch((error: unknown) => {
        if (!cancelled) setJoinError(error instanceof Error ? error.message : '수업 입장에 실패했습니다.');
      })
      .finally(() => {
        if (joiningSessionRef.current === sessionId) joiningSessionRef.current = null;
        setJoining(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, data, teamId, joinError, joining, sessionId]);

  if (authLoading || loading || !uid) return <LoadingScreen />;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f6fc] px-6 text-center">
        <p className="text-lg text-slate-600">수업을 찾을 수 없습니다. 선생님께 코드를 다시 확인해주세요.</p>
        <button
          type="button"
          onClick={() => {
            studentStorage.clear();
            navigate('/student');
          }}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
        >
          다시 입장하기
        </button>
      </div>
    );
  }

  if (data.session.status === 'ENDED' && !teamId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f6fc] px-6 text-center">
        <p className="text-lg text-slate-600">이미 종료된 수업입니다.</p>
        <button type="button" onClick={() => navigate('/')} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
          처음으로
        </button>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f6fc] px-6 text-center">
        <p className="text-lg text-slate-600">{joinError}</p>
        <button
          type="button"
          onClick={() => setJoinError(null)}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          다시 입장하기
        </button>
        <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-500 underline">
          처음으로 돌아가기
        </button>
      </div>
    );
  }

  if (!teamId) return <LoadingScreen />;

  const { session, teams, assignments = {} } = data;
  const myTeam = teams[teamId];

  if (!myTeam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fc] px-6 text-center text-slate-600">
        조 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f3f6fc]">
      {session.status === 'PAUSED' && <PausedOverlay />}
      <StudentTopBar
        nickname={myTeam.nickname}
        teamNumber={myTeam.teamNumber}
        stepLabel={phaseStepLabel(session.currentPhase)}
      />
      <StudentPhaseContent
        sessionId={sessionId}
        teamId={teamId}
        session={session}
        myTeam={myTeam}
        allTeams={teams}
        assignments={assignments}
      />
    </div>
  );
}
