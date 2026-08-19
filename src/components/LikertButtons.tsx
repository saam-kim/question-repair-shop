import { LIKERT_LABELS, LIKERT_VALUES } from '../lib/likertScale';

interface LikertButtonsProps {
  value: number | null;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

export function LikertButtons({ value, onChange, disabled }: LikertButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {LIKERT_VALUES.map((v) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`flex items-center gap-4 rounded-2xl border-2 px-6 py-4 text-left text-xl font-medium transition-all
              ${selected
                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-[0_4px_14px_-4px_rgba(37,99,235,0.35)]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}
              disabled:opacity-50`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base font-semibold
                ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-500'}`}
            >
              {v}
            </span>
            {LIKERT_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}
