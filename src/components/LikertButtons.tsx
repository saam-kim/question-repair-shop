import { getLikertLabels, LIKERT_VALUES } from '../lib/likertScale';

interface LikertButtonsProps {
  value: number | string | null;
  onChange: (value: number | string) => void;
  customLabels?: string[];
  hasOtherOption?: boolean;
  disabled?: boolean;
}

export function LikertButtons({
  value,
  onChange,
  customLabels,
  hasOtherOption,
  disabled,
}: LikertButtonsProps) {
  const labels = getLikertLabels(customLabels);
  const isOther = typeof value === 'string' && (value === '기타' || value.startsWith('기타:'));
  const otherText = typeof value === 'string' && value.startsWith('기타: ') ? value.slice(4) : '';

  function handleOtherClick() {
    if (disabled) return;
    onChange(isOther ? value as string : '기타');
  }

  function handleOtherTextChange(text: string) {
    onChange(`기타: ${text}`);
  }

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
            className={`flex items-center gap-4 rounded-2xl border px-6 py-4 text-left text-xl font-medium transition-all
              ${selected
                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}
              disabled:opacity-50`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold
                ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-500'}`}
            >
              {v}
            </span>
            <span className="break-words">{labels[v - 1]}</span>
          </button>
        );
      })}

      {hasOtherOption && (
        <div
          className={`flex flex-col gap-2 rounded-2xl border p-4 transition-all
            ${isOther
              ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={handleOtherClick}
            className="flex items-center gap-4 text-left text-xl font-medium disabled:opacity-50"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold
                ${isOther ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-500'}`}
            >
              +
            </span>
            <span>기타 (직접 작성)</span>
          </button>

          {isOther && (
            <div className="mt-2 pl-13">
              <input
                type="text"
                disabled={disabled}
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                maxLength={2000}
                aria-label="기타를 선택한 이유"
                placeholder="기타를 선택한 이유나 해당하는 답을 적어주세요"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
