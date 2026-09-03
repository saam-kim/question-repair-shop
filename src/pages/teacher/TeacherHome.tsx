import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { createSession, sessionDocRef } from '../../firebase/db';
import { teacherStorage } from '../../lib/storage';
import { LoadingScreen } from '../../components/LoadingScreen';

export function TeacherHome() {
  const navigate = useNavigate();
  const { uid, loading: authLoading, error: authError } = useAnonAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingResume, setCheckingResume] = useState(() => Boolean(teacherStorage.read()));
  const [resumeInfo, setResumeInfo] = useState<{ sessionId: string; sessionCode: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const stored = teacherStorage.read();
    if (!stored) {
      setCheckingResume(false);
      return;
    }
    getDoc(sessionDocRef(stored.sessionId)).then((snap) => {
      const session = snap.data();
      if (snap.exists() && session?.status !== 'ENDED') {
        setResumeInfo({ sessionId: stored.sessionId, sessionCode: session?.sessionCode ?? '' });
      } else {
        teacherStorage.clear();
      }
      setCheckingResume(false);
    });
  }, [uid]);

  async function handleCreate() {
    if (!uid) return;
    setCreating(true);
    setError(null);
    try {
      const { sessionId } = await createSession(uid);
      teacherStorage.write({ sessionId });
      navigate(`/teacher/${sessionId}`, { state: { showStudentJoinInfo: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : '수업 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  }

  if (checkingResume && !authError) return <LoadingScreen />;

  if (resumeInfo) {
    return (
      <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-10 shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)]">
          <div className="text-4xl" aria-hidden>🔧</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">진행 중인 수업이 있습니다</h1>
          <p className="mt-1 text-slate-500">
            수업 코드 <span className="font-semibold text-blue-700">{resumeInfo.sessionCode}</span> 수업이 아직
            종료되지 않았습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/teacher/${resumeInfo.sessionId}`)}
            className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-lg font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] hover:bg-blue-700"
          >
            이어서 진행하기
          </button>
          <button
            type="button"
            onClick={() => {
              teacherStorage.clear();
              setResumeInfo(null);
            }}
            className="mt-4 text-sm text-slate-400 underline"
          >
            새 수업 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          교사용 대시보드
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
          🔧 질문<span className="text-blue-600">수리소</span>
        </h1>
        <p className="mt-2 text-slate-500">사회와 문화 · 질문지법 체험 활동</p>
      </div>

      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)]">
        <p className="text-slate-500">버튼 하나로 새 수업을 시작하고, 학생들에게 알려줄 6자리 코드를 받으세요.</p>

        {(error || authError) && <p className="mt-3 text-sm text-rose-600">{error || authError}</p>}

        <button
          type="button"
          onClick={handleCreate}
          disabled={authLoading || creating || !uid}
          className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-lg font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors
            hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {creating ? '만드는 중...' : '🚀 새 수업 만들기'}
        </button>
      </div>
    </div>
  );
}
