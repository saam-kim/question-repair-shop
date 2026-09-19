import type { SessionPhase } from '../types';
import { PHASE_STAGES, phaseStageIndex } from '../lib/phases';

export function PhaseIndicator({ currentPhase }: { currentPhase: SessionPhase }) {
  const currentIndex = phaseStageIndex(currentPhase);
  const isEnded = currentPhase === 'ENDED';

  return (
    <div className="relative">
      <ol
        className="phase-track relative flex w-full items-start justify-between gap-1 sm:gap-2"
        aria-label="수업 진행 단계"
      >
        {PHASE_STAGES.map((stage, idx) => {
          const isCurrent = idx === currentIndex && !isEnded;
          const done = isEnded ? true : currentIndex > idx;
          return (
            <li
              key={stage.phase}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative z-10 flex flex-1 flex-col items-center gap-1.5 text-center"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white transition-colors
                ${isCurrent ? 'bg-blue-600 text-white shadow-sm' : done ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span
                className={`break-keep text-[10px] font-medium tracking-tight sm:text-sm ${
                  isCurrent
                    ? 'font-bold text-blue-700'
                    : done
                      ? 'text-blue-700'
                      : 'text-slate-500'
                }`}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
