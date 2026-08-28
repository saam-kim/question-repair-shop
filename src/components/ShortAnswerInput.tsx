interface ShortAnswerInputProps {
  value: string | number | null;
  onChange: (value: string) => void;
  unit?: string;
  disabled?: boolean;
}

export function ShortAnswerInput({ value, onChange, unit, disabled }: ShortAnswerInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          type="text"
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={unit ? `예: 3 (${unit})` : '답변을 간단히 적어주세요'}
          className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-xl font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:shadow-[0_4px_14px_-4px_rgba(37,99,235,0.2)] disabled:opacity-50"
        />
        {unit && (
          <span className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-xl font-bold text-slate-600">
            {unit}
          </span>
        )}
      </div>
      {unit && (
        <p className="text-xs text-slate-500">
          단위({unit})를 참고하여 답변을 입력해주세요.
        </p>
      )}
    </div>
  );
}
