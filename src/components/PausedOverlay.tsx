import { Icon } from './Icon';

export function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/95 px-6 text-center text-white" role="status">
      <Icon name="pause" className="mb-4 h-10 w-10" />
      <p className="text-2xl font-semibold">잠시, 선생님에게 집중해주세요</p>
      <p className="text-slate-300">잠시만 기다려주세요. 곧 다시 시작됩니다.</p>
    </div>
  );
}
