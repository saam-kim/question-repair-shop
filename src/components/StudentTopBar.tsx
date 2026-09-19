import { Brand } from './Brand';

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
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <Brand linked={false} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          {teamNumber}조 · {nickname}
        </span>
        <span className="text-xs text-slate-500">{stepLabel}</span>
      </div>
    </header>
  );
}
