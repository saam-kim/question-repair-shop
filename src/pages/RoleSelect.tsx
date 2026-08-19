import { useNavigate } from 'react-router-dom';

export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="bg-hero-gradient flex min-h-screen flex-col px-6 py-10 sm:px-12">
      <div className="text-sm font-bold tracking-tight text-slate-900">
        <span className="text-blue-600">🔧</span> 질문수리소
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          사회와 문화 · 질문지법 체험 활동
        </span>

        <h1 className="mt-5 text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
          질문<span className="text-blue-600">수리소</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-500">
          내가 만든 질문, 다른 사람이 답해보면 어떨까요?
          <br />
          응답과 피드백을 거쳐 더 좋은 질문으로 수리해봅니다.
        </p>

        <div className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/teacher')}
            className="group rounded-3xl border border-slate-100 bg-white p-8 text-left shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-8px_rgba(30,64,175,0.25)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🖥️</div>
            <div className="mt-4 text-xl font-bold text-slate-900">교사로 시작하기</div>
            <div className="mt-1.5 text-sm text-slate-500">수업을 만들고 진행합니다</div>
            <div className="mt-5 text-sm font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              시작하기 →
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="group rounded-3xl border border-slate-100 bg-white p-8 text-left shadow-[0_8px_30px_-8px_rgba(30,64,175,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-8px_rgba(30,64,175,0.25)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">📱</div>
            <div className="mt-4 text-xl font-bold text-slate-900">학생으로 참여하기</div>
            <div className="mt-1.5 text-sm text-slate-500">수업 코드를 입력해 입장합니다</div>
            <div className="mt-5 text-sm font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              입장하기 →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
