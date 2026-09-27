import { useEffect, useState } from 'react';
import { ConnectionRecoveryButton } from './ConnectionStatus';

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
          기기 인증 응답을 기다리고 있습니다. 계속 멈춰 있으면 인증을 다시 시작해주세요.
          <button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline">
            새로고침
          </button>
        </>
      ) : (
        <>
          서버 확인을 기다리고 있습니다. 연결이 돌아오면 이어서 처리하므로, 같은 내용을 다시 제출하지 말고 이 창을 열어두세요.
          <div className="mt-2"><ConnectionRecoveryButton /></div>
        </>
      )}
    </div>
  );
}
