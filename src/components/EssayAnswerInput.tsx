interface EssayAnswerInputProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function EssayAnswerInput({ value, onChange, disabled }: EssayAnswerInputProps) {
  return (
    <div className="w-full">
      <textarea
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="이 질문에 대한 생각이나 답변을 자유롭게 적어주세요..."
        className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-5 text-xl font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:shadow-[0_4px_14px_-4px_rgba(37,99,235,0.2)] disabled:opacity-50"
      />
      <p className="mt-2 text-right text-xs text-slate-400">
        {(value ?? '').trim().length}자 작성됨
      </p>
    </div>
  );
}
