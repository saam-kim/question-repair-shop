import type { SessionPhase } from '../types';
import { PHASE_STAGES, phaseStageIndex } from '../lib/phases';

export function PhaseIndicator({ currentPhase }: { currentPhase: SessionPhase }) {
  const currentIndex = phaseStageIndex(currentPhase);
  const isEnded = currentPhase === 'ENDED';
  const progressRatio = isEnded ? 1 : Math.max(0, currentIndex) / (PHASE_STAGES.length - 1);

  return (
    <ol className="relative flex items-start justify-between">
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-150" style={{ backgroundColor: '#e7ebf3' }} />
      <div
        className="absolute left-0 top-4 h-0.5 bg-blue-600 transition-all duration-500"
        style={{ width: `${progressRatio * 100}%` }}
      />
      {PHASE_STAGES.map((stage, idx) => {
        const isCurrent = idx === currentIndex && !isEnded;
        const done = isEnded ? true : currentIndex > idx;
        return (
          <li key={stage.phase} className="relative z-10 flex flex-1 flex-col items-center gap-2 text-center text-xs font-medium sm:text-sm">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white transition-colors
                ${isCurrent ? 'bg-blue-600 text-white shadow-[0_2px_10px_-2px_rgba(37,99,235,0.6)]' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {done ? '✓' : idx + 1}
            </span>
            <span className={isCurrent ? 'font-semibold text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'}>
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
