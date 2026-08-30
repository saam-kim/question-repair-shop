import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { useSession } from '../../hooks/useSession';
import { teacherStorage } from '../../lib/storage';
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
} from '../../firebase/db';
import { TeacherResults } from './TeacherResults';
import { LoadingScreen } from '../../components/LoadingScreen';

const RehearsalOverlay = lazy(() =>
  import('./RehearsalOverlay').then((m) => ({ default: m.RehearsalOverlay })),
);

export function TeacherDashboard() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { uid } = useAnonAuth();
  const { data, loading } = useSession(uid ? sessionId : null);
  const [busy, setBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (data) teacherStorage.write({ sessionId });
  }, [data, sessionId]);

  if (!uid || loading) return <LoadingScreen />;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f6fc] px-6 text-center">
        <p className="text-slate-600">수업을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => {
            teacherStorage.clear();
            navigate('/teacher');
          }}
          className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)]"
        >
          새 수업 만들기
        </button>
      </div>
    );
  }

  const { session, teams, assignments = {} } = data;
  const teamEntries = Object.entries(teams);
  const submittedTeamIds = teamEntries.filter(([, t]) => t.questionsSubmittedAt).map(([id]) => id);
  const notSubmittedTeams = teamEntries.filter(([, t]) => !t.questionsSubmittedAt);

  async function handleStart() {
    setBusy(true);
    try {
      await startClass(sessionId);
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePause() {
    setBusy(true);
    try {
      if (session.status === 'PAUSED') await resumeClass(sessionId);
      else await pauseClass(sessionId);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartResponding() {
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
    setBusy(true);
    try {
      await advancePhase(sessionId, next);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    setBusy(true);
    try {
      await endClass(sessionId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fc] pb-16">
      <header className="border-b border-slate-100 bg-white px-10 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              🏠 처음으로
            </button>
            <div className="h-8 w-px bg-slate-150" style={{ backgroundColor: '#e7ebf3' }} />
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900">
                🔧 질문<span className="text-blue-600">수리소</span>
              </p>
              <p className="text-xs text-slate-500">사회와 문화 · 질문지법</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-2 text-center">
              <p className="text-xs text-blue-500">수업 코드</p>
              <p className="text-2xl font-bold tracking-widest text-blue-700">{session.sessionCode}</p>
            </div>
            {session.status !== 'ENDED' && (
              <>
                <div className="h-8 w-px bg-slate-150" style={{ backgroundColor: '#e7ebf3' }} />
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors
                    ${showPreview ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  🧪 미리보기로 리허설
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={busy || session.status === 'LOBBY'}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  {session.status === 'PAUSED' ? '재개' : '일시정지'}
                </button>
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={busy}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  수업 종료
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-10 py-8">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-2px_rgba(30,64,175,0.06)]">
          <PhaseIndicator currentPhase={session.currentPhase} />
        </div>

        {session.currentPhase !== 'RESULT' && session.currentPhase !== 'ENDED' && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-2px_rgba(30,64,175,0.06)]">
          {session.currentPhase === 'LOBBY' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">입장한 조: {teamEntries.length}개</p>
                <p className="mt-1 text-sm text-slate-500">학생들이 수업 코드를 입력해 입장하고 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={busy || teamEntries.length === 0}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
              >
                질문 만들기 시작
              </button>
            </div>
          )}

          {session.currentPhase === 'QUESTION' && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-slate-700">
                  질문지 제출 완료: <span className="font-semibold">{submittedTeamIds.length}</span> / {teamEntries.length}조
                </p>
                <button
                  type="button"
                  onClick={handleStartResponding}
                  disabled={busy || submittedTeamIds.length < MIN_TEAMS_FOR_ASSIGNMENT}
                  className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
                >
                  응답 배정하고 시작하기
                </button>
              </div>
              {submittedTeamIds.length < MIN_TEAMS_FOR_ASSIGNMENT && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  질문지 응답 활동을 진행하려면 최소 {MIN_TEAMS_FOR_ASSIGNMENT}개 조가 질문을 제출해야 합니다.
                </p>
              )}
              {notSubmittedTeams.length > 0 && submittedTeamIds.length >= MIN_TEAMS_FOR_ASSIGNMENT && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  아직 제출하지 않은 조({notSubmittedTeams.map(([, t]) => `${t.teamNumber}조`).join(', ')})는 이번 배정에서
                  제외됩니다.
                </p>
              )}
              {assignError && <p className="mt-3 text-sm text-rose-600">{assignError}</p>}
            </div>
          )}

          {session.currentPhase === 'RESPONDING' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleAdvance('FEEDBACK_REVIEW')}
                disabled={busy}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-700"
              >
                피드백 확인 단계로
              </button>
            </div>
          )}

          {session.currentPhase === 'FEEDBACK_REVIEW' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleAdvance('REVISION')}
                disabled={busy}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-700"
              >
                질문 수리 시작
              </button>
            </div>
          )}

          {session.currentPhase === 'REVISION' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleAdvance('RESULT')}
                disabled={busy}
                className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors hover:bg-blue-700"
              >
                전체 결과 보기
              </button>
            </div>
          )}

          <div className="mt-6">
            <TeamProgressTable teams={teams} assignments={assignments} />
          </div>
        </div>
        )}

        {(session.currentPhase === 'RESULT' || session.currentPhase === 'ENDED') && (
          <div className="mt-6">
            <TeacherResults teams={teams} />
          </div>
        )}
      </main>

      {showPreview && session.status !== 'ENDED' && (
        <Suspense fallback={<LoadingScreen />}>
          <RehearsalOverlay sessionId={sessionId} onClose={() => setShowPreview(false)} />
        </Suspense>
      )}
    </div>
  );
}
