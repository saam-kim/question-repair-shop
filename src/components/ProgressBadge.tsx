export type ProgressState = 'DONE' | 'IN_PROGRESS' | 'WAITING';

const CONFIG: Record<ProgressState, { label: string; icon: string; className: string }> = {
  DONE: { label: '완료', icon: '✓', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: '진행', icon: '●', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  WAITING: { label: '대기', icon: '–', className: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export function ProgressBadge({ state }: { state: ProgressState }) {
  const c = CONFIG[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${c.className}`}>
      <span aria-hidden>{c.icon}</span>
      {c.label}
    </span>
  );
}
