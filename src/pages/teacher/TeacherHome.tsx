import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { useAnonAuth } from '../../hooks/useAnonAuth';
import { createSession, sessionDocRef, listTeacherSessions } from '../../firebase/db';
import { teacherStorage } from '../../lib/storage';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { ClassGuide } from '../../components/ClassGuide';
import { Notice } from '../../components/Notice';

export function TeacherHome() {
  const navigate = useNavigate();
  const { uid, loading: authLoading, error: authError, retry: retryAuth } = useAnonAuth();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof listTeacherSessions>>>([]);
  const [historyError, setHistoryError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingResume, setCheckingResume] = useState(() => Boolean(teacherStorage.read()));
  const [resumeInfo, setResumeInfo] = useState<{ sessionId: string; sessionCode: string } | null>(
    null,
  );

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    listTeacherSessions(uid)
      .then((sessions) => {
        if (!cancelled) setHistory(sessions);
      })
      .catch(() => {
        if (!cancelled) setHistoryError(true);
      });
    const stored = teacherStorage.read();
    if (!stored) {
      setCheckingResume(false);
      return () => {
        cancelled = true;
      };
    }
    getDoc(sessionDocRef(stored.sessionId))
      .then((snap) => {
        const session = snap.data();
        if (
          snap.exists() &&
          session?.schemaVersion === 2 &&
          session?.teacherUid === uid &&
          session?.status !== 'ENDED'
        ) {
          setResumeInfo({ sessionId: stored.sessionId, sessionCode: session?.sessionCode ?? '' });
        } else {
          teacherStorage.clear();
        }
      })
      .catch(() =>
        setError('기존 수업을 확인하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'),
      )
      .finally(() => setCheckingResume(false));
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <Link to="/student" className="btn-secondary">
          학생 입장 <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </header>
      <main className="landing-main">
        <div className="hero-grid">
          <section>
            <p className="eyebrow hero-kicker">사회와 문화 · 질문지법 탐구 활동</p>
            <h1 className="hero-title">
              좋은 질문은,
              <br />
              <span className="text-blue-600">함께 고쳐집니다.</span>
            </h1>
            <p className="hero-description">
              질문을 만들고, 서로 답하고, 더 나은 질문으로.
              <br />
              우리 반의 생각을 연결하는 질문지법 수업을 시작하세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="hero-pill">
                <Icon name="people" className="h-3.5 w-3.5" />
                최소 2개 조
              </span>
              <span className="hero-pill">
                <Icon name="clock" className="h-3.5 w-3.5" />한 차시 활동
              </span>
              <span className="hero-pill">조별 기기 1대</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={authLoading || creating || !uid}
                className="btn-primary"
              >
                {creating ? '수업을 준비하고 있습니다' : '새로운 수업 만들기'}
                <Icon name="arrow" />
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const guide = document.querySelector<HTMLDetailsElement>('#class-guide');
                  if (guide) {
                    guide.open = true;
                    guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                수업 운영 가이드
              </button>
            </div>
            {resumeInfo && (
              <button
                type="button"
                onClick={() => navigate('/teacher/' + resumeInfo.sessionId)}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-700"
              >
                진행 중인 수업 이어가기{' '}
                <span className="rounded bg-blue-50 px-2 py-1 font-mono">
                  {resumeInfo.sessionCode}
                </span>
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            )}
            <p className="mt-4 text-xs text-slate-500">
              설치 없이 브라우저에서 · 학생은 QR 또는 수업 코드로 입장
            </p>
            {(error || authError) && (
              <div className="mt-4">
                <Notice>{error || authError}</Notice>
                {authError && (
                  <button type="button" className="btn-secondary mt-3" onClick={retryAuth}>
                    다시 연결
                  </button>
                )}
              </div>
            )}
          </section>
          <aside className="hero-example" aria-label="질문 수리 활동 예시">
            <div className="mb-5 flex items-center justify-between">
              <p className="eyebrow">작은 수정, 더 좋은 질문</p>
              <span className="text-xs text-slate-500">활동 예시</span>
            </div>
            <div className="example-card example-before">
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="step-number">01</span>처음 만든 질문
              </div>
              <p className="text-lg font-medium text-slate-800">
                학교 급식은 맛있고
                <br />
                양도 충분한가요?
              </p>
              <div className="example-feedback">
                <Icon name="message" className="mt-1 h-4 w-4" />
                <span>
                  “맛과 양에 대한 생각이 달라서
                  <br />
                  어떻게 답해야 할지 모르겠어요.”
                </span>
              </div>
            </div>
            <div className="example-connector">
              <Icon name="arrow" className="rotate-90" />
            </div>
            <div className="example-card example-after">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-blue-700">
                <span className="step-number">
                  <Icon name="check" className="h-3 w-3" />
                </span>
                피드백으로 수리한 질문
              </div>
              <p className="text-lg font-semibold text-blue-900">학교 급식의 양은 충분한가요?</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                한 문항에서 한 가지 내용만 묻도록 수정했어요.
              </p>
            </div>
          </aside>
        </div>
        {historyError && (
          <div className="mb-6">
            <Notice>이전 수업 목록을 불러오지 못했습니다. 새로고침하면 다시 확인합니다.</Notice>
          </div>
        )}
        {history.length > 0 && (
          <section className="surface mb-8 p-6" aria-label="내 수업 기록">
            <h2 className="font-semibold">내 수업 기록</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              이 브라우저에서 만든 수업입니다. 종료된 수업도 결과를 확인하고 내려받을 수 있습니다.
            </p>
            <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {history.map((s) => (
                <Link
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-blue-300"
                  key={s.id}
                  to={'/teacher/' + s.id}
                >
                  <span>
                    <strong className="font-mono text-sm">{s.sessionCode}</strong>
                    <span className="ml-3 text-xs text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </span>
                  <span className="text-xs text-blue-700">
                    {s.status === 'ENDED' ? '종료 · 결과 보기' : '이어서 하기'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="lesson-strip" aria-label="활동 순서">
          {[
            ['질문 만들기', '조사 주제와 질문 3개'],
            ['서로 응답하기', '다른 조에 응답과 피드백'],
            ['피드백 읽기', '질문의 어려움 발견'],
            ['질문 수리하기', '더 명확한 질문으로 수정'],
            ['결과 나누기', '수리 전후를 함께 비교'],
          ].map(([title, desc], i) => (
            <div key={title}>
              <span className="eyebrow text-blue-600">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </section>
        <ClassGuide />
      </main>
      <footer className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-8 py-8 text-xs text-slate-500">
        <span>질문수리소 · 서로의 응답으로 배우는 수업</span>
        <span>사회와 문화 / 자료 수집 방법</span>
      </footer>
    </div>
  );
}
