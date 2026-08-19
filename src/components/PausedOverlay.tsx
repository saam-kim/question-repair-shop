export function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/90 text-white">
      <div className="text-6xl">⏸</div>
      <p className="text-2xl font-semibold">선생님이 활동을 잠시 멈췄습니다</p>
      <p className="text-slate-300">잠시만 기다려주세요. 곧 다시 시작됩니다.</p>
    </div>
  );
}
