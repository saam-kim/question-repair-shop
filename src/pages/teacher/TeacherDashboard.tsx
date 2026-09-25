import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { useSession } from '../../hooks/useSession';
import { teacherStorage, belongsToThisBrowser } from '../../lib/storage';
import { PhaseIndicator } from '../../components/PhaseIndicator';
import { TeamProgressTable } from '../../components/TeamProgressTable';
import { assignReviewers, MIN_TEAMS_FOR_ASSIGNMENT } from '../../lib/assignmentAlgorithm';
import {
  startClass,
  pauseClass,
  resumeClass,
  advancePhase,
  endClass,
  writeAssignments,
  deleteSession,
} from '../../firebase/db';
import { downloadClassroom } from '../../lib/exportClassroom';
import { TeacherResults } from './TeacherResults';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { SlowRequestHint } from '../../components/SlowRequestHint';
import { alternateNetworkModeUrl, isSchoolNetworkMode } from '../../lib/networkMode';
import { ClassGuide } from '../../components/ClassGuide';
import { respondingStatus } from '../../lib/teamStatus';
import { StudentJoinShareDialog } from '../../components/StudentJoinShareDialog';

export function TeacherDashboard() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { uid, error: authError } = useAnonAuth();
  const { data, loading, error: sessionError } = useSession(uid ? sessionId : null, true, uid);
  const [busy, setBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showStudentJoinInfo, setShowStudentJoinInfo] = useState(() =>
    Boolean((location.state as { showStudentJoinInfo?: boolean } | null)?.showStudentJoinInfo),
  );

  useEffect(() => {
    if (belongsToThisBrowser(data?.session.teacherUid, uid)) teacherStorage.write({ sessionId });
  }, [data, sessionId, uid]);

  if (authError || sessionError)
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Notice>수업에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.</Notice>
        <button className="btn-secondary mt-4" onClick={() => window.location.reload()}>
          다시 연결
        </button>
        <a className="btn-secondary ml-2 mt-4" href={alternateNetworkModeUrl()}>
          {isSchoolNetworkMode() ? '기본 연결 방식' : '학교망 연결 방식'}
        </a>
      </div>
    );

  if (!uid || loading) return <LoadingScreen />;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-slate-600">수업을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => {
            teacherStorage.clear();
            navigate('/teacher');
          }}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm"
        >
          새 수업 만들기
        </button>
      </div>
    );
  }

  if (data.session.schemaVersion !== 2)
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Notice>
          이전 버전에서 만든 수업입니다. 보안 업데이트 이후에는 새 수업을 만들어주세요. 이전 기록이
          필요하면 운영자에게 수업 코드를 알려주세요.
        </Notice>
        <button className="btn-primary mt-4" onClick={() => navigate('/teacher')}>
          새 수업 만들기
        </button>
      </div>
    );

  if (!belongsToThisBrowser(data.session.teacherUid, uid))
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Notice>수업을 만든 브라우저에서만 교사 화면을 열 수 있습니다.</Notice>
        <button className="btn-secondary mt-4" onClick={() => navigate('/student/' + sessionId)}>
          학생으로 입장하기
        </button>
      </div>
    );

  const { session, teams, assignments = {} } = data;
  const studentUrl = new URL(window.location.href);
  studentUrl.hash = `/${session.sessionCode}`;
  const teamEntries = Object.entries(teams);
  const submittedTeamIds = teamEntries.filter(([, t]) => t.questionsSubmittedAt).map(([id]) => id);
  const notSubmittedTeams = teamEntries.filter(([, t]) => !t.questionsSubmittedAt);

  async function handleStart() {
    setAssignError(null);
    setBusy(true);
    try {
      await startClass(sessionId);
    } catch (e) {
      setAssignError(
        e instanceof Error ? e.message : '요청을 저장하지 못했습니다. 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePause() {
    setAssignError(null);
    setBusy(true);
    try {
      if (session.status === 'PAUSED') await resumeClass(sessionId);
      else await pauseClass(sessionId);
    } catch (e) {
      setAssignError(
        e instanceof Error ? e.message : '요청을 저장하지 못했습니다. 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStartResponding() {
    if (
      notSubmittedTeams.length &&
      !window.confirm('아직 질문을 제출하지 않은 조는 응답 배정에서 제외됩니다. 계속할까요?')
    )
      return;
    setAssignError(null);
    setBusy(true);
    try {
      const assignments = assignReviewers(submittedTeamIds);
      await writeAssignments(sessionId, assignments);
      await advancePhase(sessionId, 'RESPONDING');
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : '배정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance(next: Parameters<typeof advancePhase>[1]) {
    const unfinished =
      next === 'FEEDBACK_REVIEW'
        ? Object.keys(assignments).filter(
            (id) => !teams[id] || respondingStatus(teams[id], assignments, id) !== 'DONE',
          ).length
        : next === 'RESULT'
          ? teamEntries.filter(([, team]) => !team.revisionsSubmittedAt).length
          : 0;
    if (
      unfinished &&
      !window.confirm(
        '아직 활동을 마치지 않은 조가 ' + unfinished + '개 있습니다. 다음 단계로 이동할까요?',
      )
    )
      return;
    setAssignError(null);
    setBusy(true);
    try {
      await advancePhase(sessionId, next);
    } catch (e) {
      setAssignError(
        e instanceof Error ? e.message : '요청을 저장하지 못했습니다. 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    if (
      !window.confirm(
        '수업을 종료할까요? 학생 활동이 멈추며, 종료한 수업은 다시 시작할 수 없습니다.',
      )
    )
      return;
    setAssignError(null);
    setBusy(true);
    try {
      await endClass(sessionId);
    } catch (e) {
      setAssignError(
        e instanceof Error ? e.message : '요청을 저장하지 못했습니다. 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        '질문·응답·피드백을 포함한 이 수업의 모든 기록을 삭제할까요? 삭제 후에는 복구할 수 없습니다. 필요한 결과를 먼저 내려받아주세요.',
      )
    )
      return;
    setBusy(true);
    setAssignError(null);
    try {
      await deleteSession(sessionId);
      teacherStorage.clear();
      navigate('/teacher', { replace: true });
    } catch {
      setAssignError('기록을 삭제하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  const phaseCopy = {
    LOBBY: [
      '학생들을 초대해주세요',
      'QR이나 수업 코드를 공유하세요. 조별 대표 기기 한 대로 입장합니다.',
    ],
    QUESTION: [
      '우리 반의 질문이 만들어지고 있어요',
      '각 조가 조사 주제와 질문 3개를 제출하면 응답을 배정할 수 있습니다.',
    ],
    RESPONDING: [
      '서로의 질문에 답하는 시간',
      '응답과 피드백 진행 상황을 확인하고, 활동이 끝나면 다음 단계로 이동하세요.',
    ],
    FEEDBACK_REVIEW: [
      '피드백에서 수정의 실마리를 찾아보세요',
      '학생들이 피드백을 충분히 읽고 조원들과 이야기할 시간을 주세요.',
    ],
    REVISION: [
      '더 나은 질문으로 고치는 중입니다',
      '질문의 어떤 점을 바꾸었는지, 그 이유도 함께 설명하도록 안내하세요.',
    ],
    RESULT: [
      '작은 수정이 만든 변화를 나눠보세요',
      '수리 전후를 비교하며 좋은 질문의 조건을 함께 정리하세요.',
    ],
    ENDED: [
      '함께 만든 질문, 수고했어요',
      '수업이 종료되었습니다. 아래에서 우리 반의 수리 사례를 확인할 수 있습니다.',
    ],
  }[session.currentPhase];
  const nextActions = {
    LOBBY: { label: '질문 만들기 시작', run: handleStart, disabled: teamEntries.length < 2 },
    QUESTION: {
      label: '응답 배정하고 시작하기',
      run: handleStartResponding,
      disabled: submittedTeamIds.length < MIN_TEAMS_FOR_ASSIGNMENT,
    },
    RESPONDING: {
      label: '피드백 확인 단계로',
      run: () => handleAdvance('FEEDBACK_REVIEW'),
      disabled: false,
    },
    FEEDBACK_REVIEW: {
      label: '질문 수리 시작',
      run: () => handleAdvance('REVISION'),
      disabled: false,
    },
    REVISION: { label: '전체 결과 보기', run: () => handleAdvance('RESULT'), disabled: false },
  };
  const action = nextActions[session.currentPhase as keyof typeof nextActions];
  const responsesDone = Object.keys(assignments).filter(
    (id) => teams[id] && respondingStatus(teams[id], assignments, id) === 'DONE',
  ).length;

  return (
    <div className="workspace pb-12">
      <header className="workspace-header">
        <div className="workspace-header-inner">
          <Brand />
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="status-dot text-blue-500" />
              {session.status === 'PAUSED'
                ? '일시정지'
                : session.status === 'ENDED'
                  ? '수업 종료'
                  : '교사 대시보드'}
            </span>
            {session.status !== 'ENDED' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowStudentJoinInfo(true)}
                  className="btn-secondary"
                >
                  <Icon name="qr" />
                  학생 초대{' '}
                  <strong className="ml-1 font-mono tracking-widest text-blue-700">
                    {session.sessionCode}
                  </strong>
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={busy || session.status === 'LOBBY'}
                  className="btn-secondary"
                >
                  <Icon name="pause" className="h-4 w-4" />
                  {session.status === 'PAUSED' ? '활동 재개' : '일시정지'}
                </button>
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={busy}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                >
                  수업 종료
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="workspace-main">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">OUR CLASSROOM</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              {phaseCopy[0]}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{phaseCopy[1]}</p>
          </div>
        </div>
        <div className="surface p-4 sm:p-6">
          <PhaseIndicator currentPhase={session.currentPhase} />
        </div>
        <div className="workspace-stats">
          <div className="surface stat">
            <p>입장한 조</p>
            <strong>
              {teamEntries.length}
              <span className="ml-1 text-sm font-normal text-slate-500">개 조</span>
            </strong>
          </div>
          <div className="surface stat">
            <p>질문지 제출</p>
            <strong>
              {submittedTeamIds.length}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {teamEntries.length}
              </span>
            </strong>
          </div>
          <div className="surface stat">
            <p>
              {session.currentPhase === 'REVISION' ||
              session.currentPhase === 'RESULT' ||
              session.currentPhase === 'ENDED'
                ? '수리 완료'
                : '응답 완료'}
            </p>
            <strong>
              {session.currentPhase === 'REVISION' ||
              session.currentPhase === 'RESULT' ||
              session.currentPhase === 'ENDED'
                ? teamEntries.filter(([, t]) => t.revisionsSubmittedAt).length
                : responsesDone}
              <span className="ml-1 text-sm font-normal text-slate-500">개 조</span>
            </strong>
          </div>
        </div>
        {assignError && (
          <div className="mb-4">
            <Notice>{assignError}</Notice>
          </div>
        )}
        {busy && <div className="mb-4"><SlowRequestHint /></div>}
        {session.status === 'PAUSED' && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            학생 화면이 일시정지 상태입니다. ‘활동 재개’를 누르면 이어서 진행합니다.
          </p>
        )}
        {action && (
          <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 className="text-base font-semibold">조별 진행 현황</h2>
                <p className="mt-1 text-xs text-slate-500">
                  조 이름을 누르면 작성한 질문을 확인할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={action.run}
                disabled={busy || action.disabled || session.status === 'PAUSED'}
                className="btn-primary"
              >
                {busy ? '저장하는 중…' : action.label}
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            </div>
            {session.currentPhase === 'LOBBY' && teamEntries.length < 2 && (
              <p className="mx-6 mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                서로 응답하려면 최소 2개 조가 필요합니다. 학생들에게 QR이나 코드를 공유해주세요.
              </p>
            )}
            {session.currentPhase === 'QUESTION' && notSubmittedTeams.length > 0 && (
              <p className="mx-6 mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {submittedTeamIds.length < 2
                  ? '최소 2개 조의 질문지가 제출되어야 응답을 배정할 수 있습니다.'
                  : '아직 제출하지 않은 조는 이번 응답 배정에서 제외됩니다.'}
              </p>
            )}
            <div className="p-5 sm:p-6">
              <TeamProgressTable teams={teams} assignments={assignments} />
            </div>
          </section>
        )}
        {(session.currentPhase === 'RESULT' || session.currentPhase === 'ENDED') && (
          <TeacherResults teams={teams} />
        )}
        <section className="surface mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">수업 기록 보관</h2>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              질문, 응답, 피드백과 수리 결과를 엑셀에서 열 수 있는 CSV로 내려받습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              onClick={() => downloadClassroom(data)}
              disabled={!teamEntries.length}
            >
              <Icon name="download" className="h-4 w-4" />
              결과 내려받기
            </button>
            {session.status === 'ENDED' && (
              <button
                className="btn-secondary text-rose-700"
                disabled={busy}
                onClick={handleDelete}
              >
                수업 기록 삭제
              </button>
            )}
          </div>
        </section>
        <div className="mt-6">
          <ClassGuide />
        </div>
      </main>
      {showStudentJoinInfo && session.status !== 'ENDED' && (
        <StudentJoinShareDialog
          studentUrl={studentUrl.toString()}
          sessionCode={session.sessionCode}
          onClose={() => setShowStudentJoinInfo(false)}
        />
      )}
    </div>
  );
}
