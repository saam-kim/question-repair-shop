interface MultipleChoiceButtonsProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MultipleChoiceButtons({ options, value, onChange, disabled }: MultipleChoiceButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((option, idx) => {
        const selected = value === option;
        return (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
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
              {idx + 1}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}
