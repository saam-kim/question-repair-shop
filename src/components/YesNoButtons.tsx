const YES_NO_OPTIONS = ['예', '아니요'] as const;

interface YesNoButtonsProps {
  value: number | string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function YesNoButtons({ value, onChange, disabled }: YesNoButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="예/아니요 응답">
      {YES_NO_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`rounded-2xl border px-6 py-4 text-xl font-medium transition-colors
            ${value === option
              ? 'border-blue-600 bg-blue-50 text-blue-900'
              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}
            disabled:opacity-50`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
