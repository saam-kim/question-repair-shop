import type { SessionPhase } from '../types';
import { PHASE_STAGES, phaseStageIndex } from '../lib/phases';

export function PhaseIndicator({ currentPhase }: { currentPhase: SessionPhase }) {
  const currentIndex = phaseStageIndex(currentPhase);
  const isEnded = currentPhase === 'ENDED';
  const progressRatio = isEnded ? 1 : Math.max(0, currentIndex) / (PHASE_STAGES.length - 1);

  return (
    <ol className="relative flex w-full items-start justify-between gap-1 sm:gap-2">
      <div className="absolute left-6 right-6 top-3.5 h-0.5" style={{ backgroundColor: '#e7ebf3' }} />
      <div
        className="absolute left-6 top-3.5 h-0.5 bg-blue-600 transition-all duration-500"
        style={{ width: `calc(${progressRatio * 100}% - ${progressRatio * 48}px)` }}
      />
      {PHASE_STAGES.map((stage, idx) => {
        const isCurrent = idx === currentIndex && !isEnded;
        const done = isEnded ? true : currentIndex > idx;
        return (
          <li key={stage.phase} className="relative z-10 flex flex-1 flex-col items-center gap-1.5 text-center">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white transition-colors
                ${isCurrent ? 'bg-blue-600 text-white shadow-[0_2px_8px_-1px_rgba(37,99,235,0.5)]' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {done ? '✓' : idx + 1}
            </span>
            <span
              className={`whitespace-nowrap text-xs font-medium tracking-tight sm:text-sm ${
                isCurrent ? 'font-bold text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
