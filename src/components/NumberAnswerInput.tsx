interface NumberAnswerInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  disabled?: boolean;
}

export function NumberAnswerInput({ value, onChange, unit, disabled }: NumberAnswerInputProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="0"
        className="w-40 rounded-2xl border-2 border-slate-200 px-6 py-4 text-center text-2xl font-semibold outline-none focus:border-blue-500 disabled:opacity-50"
      />
      {unit && <span className="text-xl text-slate-500">{unit}</span>}
    </div>
  );
}
