import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { useSession } from '../../hooks/useSession';
import { studentStorage } from '../../lib/storage';
import { StudentTopBar } from '../../components/StudentTopBar';
import { PausedOverlay } from '../../components/PausedOverlay';
import { LoadingScreen } from '../../components/LoadingScreen';
import { phaseStepLabel } from '../../lib/phases';
import { StudentPhaseContent } from './StudentPhaseContent';

export function StudentApp() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAnonAuth();
  const { data, loading } = useSession(uid ? sessionId : null);

  const stored = studentStorage.read();
  const teamId = stored?.teamId ?? null;

  useEffect(() => {
    if (!stored || stored.sessionId !== sessionId) {
      navigate('/student', { replace: true });
    }
  }, [stored, sessionId, navigate]);

  if (authLoading || loading || !uid || !teamId) return <LoadingScreen />;

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
