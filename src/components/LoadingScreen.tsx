import { useEffect, useState } from 'react';
import { alternateNetworkModeUrl, isSchoolNetworkMode } from '../lib/networkMode';

export function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" aria-hidden="true" />
      <p className="text-sm text-slate-500">수업을 불러오고 있습니다</p>
      {slow && (
        <div className="mt-2 max-w-sm space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            연결이 예상보다 오래 걸립니다. Wi-Fi 상태를 확인한 뒤 다시 시도할 수 있습니다.
          </p>
          <a className="btn-secondary" href={alternateNetworkModeUrl()}>
            {isSchoolNetworkMode() ? '기본 연결 방식으로 다시 시도' : '학교망 연결 방식으로 다시 시도'}
          </a>
        </div>
      )}
    </div>
  );
}
