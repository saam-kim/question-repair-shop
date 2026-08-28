import { useState, useEffect } from 'react';
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
  const [otherText, setOtherText] = useState(() => {
    if (typeof value === 'string' && value.startsWith('기타: ')) {
      return value.replace('기타: ', '');
    }
    return '';
  });

  useEffect(() => {
    if (typeof value === 'string' && value.startsWith('기타: ')) {
      setOtherText(value.replace('기타: ', ''));
    } else if (!isOther) {
      setOtherText('');
    }
  }, [value, isOther]);

  function handleOtherClick() {
    if (disabled) return;
    const nextVal = otherText.trim() ? `기타: ${otherText.trim()}` : '기타';
    onChange(nextVal);
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text);
    onChange(text.trim() ? `기타: ${text.trim()}` : '기타');
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
            <span className="break-words">{labels[v - 1]}</span>
          </button>
        );
      })}

      {hasOtherOption && (
        <div
          className={`flex flex-col gap-2 rounded-2xl border-2 p-4 transition-all
            ${isOther
              ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-[0_4px_14px_-4px_rgba(37,99,235,0.35)]'
              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={handleOtherClick}
            className="flex items-center gap-4 text-left text-xl font-medium disabled:opacity-50"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base font-semibold
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
                placeholder="내용을 직접 입력해주세요"
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
