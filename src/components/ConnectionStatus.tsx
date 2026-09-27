import { useEffect, useState } from 'react';
import { recoverConnection } from '../lib/connectionRecovery';

export function ConnectionRecoveryButton({ label = '연결 다시 시도' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <span className="inline-flex flex-wrap items-center gap-2">
    <button type="button" disabled={busy} className="text-sm font-semibold text-blue-700 underline underline-offset-4 disabled:opacity-50" onClick={async () => {
      setBusy(true);
      setFailed(false);
      try { await recoverConnection(); }
      catch { setFailed(true); }
      finally { setBusy(false); }
    }}>{busy ? '연결을 다시 여는 중…' : label}</button>
    {failed && <span role="status" className="text-xs text-amber-800">아직 연결되지 않았습니다. 잠시 후 다시 시도해주세요.</span>}
  </span>;
}

export function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return <div className={`flex flex-wrap items-center justify-end gap-3 px-5 py-2 text-xs ${online ? 'text-slate-500' : 'bg-amber-50 text-amber-900'}`}>
    {!online && <span role="status">인터넷 연결이 끊겼습니다. 연결이 돌아오면 저장과 화면 갱신을 이어갑니다. 이 창을 열어두세요.</span>}
    <ConnectionRecoveryButton label="화면 다시 동기화" />
  </div>;
}
