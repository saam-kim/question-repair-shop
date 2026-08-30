import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { sessionDocRef, findSessionByCode, joinOrCreateTeam } from '../../firebase/db';
import { studentStorage } from '../../lib/storage';
import { LoadingScreen } from '../../components/LoadingScreen';

export function StudentJoin() {
  const navigate = useNavigate();
  const { uid, loading: authLoading, error: authError } = useAnonAuth();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingResume, setCheckingResume] = useState(() => Boolean(studentStorage.read()));
  const [resumeInfo, setResumeInfo] = useState<{ sessionId: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const stored = studentStorage.read();
    if (!stored) {
      setCheckingResume(false);
      return;
    }
    getDoc(sessionDocRef(stored.sessionId)).then((snap) => {
      if (snap.exists() && snap.data().status !== 'ENDED') {
        setResumeInfo({ sessionId: stored.sessionId });
      } else {
        studentStorage.clear();
      }
      setCheckingResume(false);
    });
  }, [uid]);

  async function handleJoin() {
    if (!uid) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('6자리 숫자 코드를 입력해주세요.');
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const sessionId = await findSessionByCode(trimmed);
      if (!sessionId) {
        setError('해당 코드의 수업을 찾을 수 없습니다. 코드를 다시 확인해주세요.');
        return;
      }
      const snap = await getDoc(sessionDocRef(sessionId));
      if (snap.data()?.status === 'ENDED') {
        setError('이미 종료된 수업입니다.');
        return;
      }
      const { teamId } = await joinOrCreateTeam(sessionId, uid);
      studentStorage.write({ sessionId, teamId, sessionCode: trimmed });
      navigate(`/student/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '입장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setJoining(false);
    }
  }

  if (checkingResume && !authError) return <LoadingScreen />;

  if (resumeInfo) {
    return (
      <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-10 shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)]">
          <div className="text-4xl" aria-hidden>🔧</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">이전에 참여하던 활동을 찾았습니다</h1>
          <p className="mt-1 text-slate-500">이어서 진행할까요?</p>
          <button
            type="button"
            onClick={() => navigate(`/student/${resumeInfo.sessionId}`)}
            className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-lg font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] hover:bg-blue-700"
          >
            이어서 하기
          </button>
          <button
            type="button"
            onClick={() => {
              studentStorage.clear();
              setResumeInfo(null);
            }}
            className="mt-4 text-sm text-slate-400 underline"
          >
            다른 코드로 입장하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          학생 접속
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
          🔧 질문<span className="text-blue-600">수리소</span>
        </h1>
        <p className="mt-2 text-slate-500">선생님이 알려준 6자리 수업 코드를 입력하세요</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)]">
        <label className="block text-sm font-semibold text-slate-700">수업 코드</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl tracking-[0.3em] outline-none focus:border-blue-500 focus:bg-white"
        />

        {(error || authError) && <p className="mt-3 text-sm text-rose-600">{error || authError}</p>}

        <button
          type="button"
          onClick={handleJoin}
          disabled={authLoading || joining || !uid}
          className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-lg font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-colors
            hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {joining ? '입장하는 중...' : '🚀 입장하기'}
        </button>
      </div>
    </div>
  );
}
