import { useEffect, useState } from 'react';

export function SlowRequestHint({ auth = false }: { auth?: boolean }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!slow) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      {auth ? (
        <>
          기기 인증이 지연되고 있습니다. Wi-Fi 상태를 확인하고, 계속 멈춰 있으면 새로고침해주세요.
          <button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline">
            새로고침
          </button>
        </>
      ) : (
        '서버 응답이 늦습니다. Wi-Fi 상태를 확인해주세요. 계속 멈춰 있으면 새로고침 후 저장 여부를 확인하고 다시 제출하세요.'
      )}
    </div>
  );
}
