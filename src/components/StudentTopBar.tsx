export function StudentTopBar({
  nickname,
  teamNumber,
  stepLabel,
}: {
  nickname: string;
  teamNumber: number;
  stepLabel: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🔧</span>
        <span className="text-lg font-black tracking-tight text-slate-900">질문수리소</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-base font-semibold text-blue-700">
          {teamNumber}조 · {nickname}
        </span>
        <span className="text-base text-slate-500">{stepLabel}</span>
      </div>
    </header>
  );
}
