import { useEffect, useState } from 'react';
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
import { Notice } from '../../components/Notice';
import { alternateNetworkModeUrl, isSchoolNetworkMode } from '../../lib/networkMode';

export function StudentApp() {
  const { sessionId = '' } = useParams();
  return <StudentSessionApp key={sessionId} sessionId={sessionId} />;
}

interface StudentSessionAppProps {
  sessionId: string;
}

function StudentSessionApp({ sessionId }: StudentSessionAppProps) {
  const navigate = useNavigate();
  const { uid, loading: authLoading, error: authError } = useAnonAuth();

  const [teamId, setTeamId] = useState<string | null>(null);
  const {
    data,
    loading,
    error: sessionError,
  } = useSession(uid ? sessionId : null, Boolean(teamId));
  const [joinError, setJoinError] = useState<string | null>(null);

  const sessionCode = data?.session.sessionCode;
  const sessionEnded = data?.session.status === 'ENDED';

  useEffect(() => {
    if (!uid || !sessionCode || teamId || joinError || sessionEnded) return;

    let cancelled = false;
    joinOrCreateTeam(sessionId, uid)
      .then(({ teamId: newTeamId }) => {
        if (cancelled) return;
        studentStorage.write({ sessionId, teamId: newTeamId, sessionCode });
        setTeamId(newTeamId);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setJoinError(error instanceof Error ? error.message : '수업 입장에 실패했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [uid, sessionCode, sessionEnded, teamId, joinError, sessionId]);

  if (authError || sessionError)
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Notice>수업 연결이 끊겼습니다. 인터넷 연결을 확인하고 다시 시도해주세요.</Notice>
        <button className="btn-secondary mt-4" onClick={() => window.location.reload()}>
          다시 연결
        </button>
        <a className="btn-secondary ml-2 mt-4" href={alternateNetworkModeUrl()}>
          {isSchoolNetworkMode() ? '기본 연결 방식' : '학교망 연결 방식'}
        </a>
      </div>
    );

  if (authLoading || loading || !uid) return <LoadingScreen />;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-lg text-slate-600">
          수업을 찾을 수 없습니다. 선생님께 코드를 다시 확인해주세요.
        </p>
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-lg text-slate-600">이미 종료된 수업입니다.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
        >
          처음으로
        </button>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-lg text-slate-600">{joinError}</p>
        <button
          type="button"
          onClick={() => setJoinError(null)}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          다시 입장하기
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-slate-500 underline"
        >
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
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center text-slate-600">
        조 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="student-shell">
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
