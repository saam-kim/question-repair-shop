import { Icon } from './Icon';

export function WaitingScreen({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center" role="status">
      <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"><Icon name="clock" className="h-7 w-7" /></div>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description && <p className="max-w-md text-slate-500">{description}</p>}
      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><span className="status-dot text-blue-500" />화면은 수업 진행에 맞춰 자동으로 바뀝니다</p>
    </div>
  );
}
