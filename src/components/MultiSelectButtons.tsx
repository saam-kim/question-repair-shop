export function MultiSelectButtons({
  value,
  options,
  hasOtherOption,
  onChange,
}: {
  value: string[];
  options: string[];
  hasOtherOption?: boolean;
  onChange: (value: string[]) => void;
}) {
  const other = value.find((v) => v === '기타' || v.startsWith('기타: '));
  const otherText = other?.startsWith('기타: ') ? other.slice(4) : '';
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }
  return (
    <div className="space-y-3" role="group" aria-label="복수 선택 응답">
      <p className="text-sm text-slate-500">해당하는 항목을 모두 선택하세요.</p>
      {options.map((option, index) => (
        <label key={index} className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 text-lg ${value.includes(option) ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}>
          <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} className="h-5 w-5 accent-blue-600" />
          <span>{option}</span>
        </label>
      ))}
      {hasOtherOption && (
        <div className={`rounded-2xl border px-5 py-4 ${other ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <label className="flex cursor-pointer items-center gap-4 text-lg text-slate-700">
            <input type="checkbox" checked={Boolean(other)} onChange={() => {
              if (other) onChange(value.filter((v) => v !== other));
              else onChange([...value, '기타']);
            }} className="h-5 w-5 accent-blue-600" />
            기타 (직접 작성)
          </label>
          {other && <input
            aria-label="기타를 선택한 이유"
            maxLength={2000}
            value={otherText}
            onChange={(e) => {
              const text = e.target.value;
              onChange([...value.filter((v) => v !== other), `기타: ${text}`]);
            }}
            placeholder="해당하는 다른 답이나 이유를 적어주세요"
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-blue-500"
          />}
        </div>
      )}
    </div>
  );
}
