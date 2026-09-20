import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { sessionDocRef, findSessionByCode, joinOrCreateTeam } from '../../firebase/db';
import { studentStorage } from '../../lib/storage';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';

export function StudentJoin() {
  const navigate = useNavigate();
  const { shortcutCode } = useParams();
  const { uid, loading: authLoading, error: authError } = useAnonAuth();
  const isShortcutCode = /^\d{6}$/.test(shortcutCode ?? '');
  const [code, setCode] = useState(() => (isShortcutCode ? shortcutCode ?? '' : ''));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingResume, setCheckingResume] = useState(() => !isShortcutCode && Boolean(studentStorage.read()));
  const [resumeInfo, setResumeInfo] = useState<{ sessionId: string } | null>(null);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    if (!uid) return;
    if (isShortcutCode) {
      return;
    }
    const stored = studentStorage.read();
    if (!stored) {
      setCheckingResume(false);
      return;
    }
    getDoc(sessionDocRef(stored.sessionId))
      .then((snap) => {
        if (snap.exists() && snap.data().schemaVersion === 2 && snap.data().status !== 'ENDED') {
          setResumeInfo({ sessionId: stored.sessionId });
        } else {
          studentStorage.clear();
        }
      })
      .catch(() => setError('이전 수업을 확인하지 못했습니다. 코드를 입력해 다시 입장해주세요.'))
      .finally(() => setCheckingResume(false));
  }, [isShortcutCode, uid]);

  const joinWithCode = useCallback(async (codeToJoin: string) => {
    if (!uid) return;
    const trimmed = codeToJoin.trim();
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
  }, [navigate, uid]);

  useEffect(() => {
    if (!isShortcutCode || !uid || checkingResume || autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    void joinWithCode(shortcutCode ?? '');
  }, [checkingResume, isShortcutCode, joinWithCode, shortcutCode, uid]);

  if (checkingResume && !authError) return <LoadingScreen />;

  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <Link to="/" className="text-sm text-slate-500 hover:text-blue-700">
          교사 화면으로
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-col px-5 pb-12 pt-10 sm:pt-16">
        <p className="eyebrow">STUDENT WORKSPACE</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {resumeInfo ? '다시 만나서 반가워요.' : '우리 조의 질문, 시작해볼까요?'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {resumeInfo
            ? '이전에 참여하던 수업을 찾았습니다. 이어서 활동할 수 있어요.'
            : '선생님이 알려준 6자리 수업 코드를 입력해주세요.'}
        </p>
        <form
          className="surface mt-7 p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (resumeInfo) navigate('/student/' + resumeInfo.sessionId);
            else void joinWithCode(code);
          }}
        >
          {!resumeInfo && (
            <>
              <label htmlFor="class-code" className="block text-sm font-semibold text-slate-700">
                수업 코드
              </label>
              <input
                id="class-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{6}"
                placeholder="000000"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-5 text-center font-mono text-3xl tracking-[0.25em] outline-none focus:border-blue-500 focus:bg-white"
              />
              <p className="mt-3 text-xs leading-6 text-slate-500">
                한 조에서는 대표 기기 한 대로 접속하세요.
                <br />조 이름은 입장할 때 자동으로 정해집니다.
              </p>
            </>
          )}
          {(error || authError) && (
            <div className="mt-4">
              <Notice>{error || authError}</Notice>
            </div>
          )}
          <button
            type="submit"
            disabled={authLoading || joining || !uid || (!resumeInfo && code.length !== 6)}
            className="btn-primary mt-6 w-full"
          >
            {joining ? '수업에 입장하고 있습니다' : resumeInfo ? '이어서 하기' : '수업 입장하기'}
            <Icon name="arrow" />
          </button>
          {resumeInfo && (
            <button
              type="button"
              onClick={() => {
                studentStorage.clear();
                setResumeInfo(null);
              }}
              className="mt-5 w-full text-sm text-slate-500 underline underline-offset-4"
            >
              다른 코드로 입장하기
            </button>
          )}
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          서로의 질문에 답하고, 더 좋은 질문을 함께 만들어보세요.
        </p>
      </main>
    </div>
  );
}
