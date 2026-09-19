export function LoadingScreen() {
  return (
    <div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center gap-4" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" aria-hidden="true" />
      <p className="text-sm text-slate-500">수업을 불러오고 있습니다</p>
    </div>
  );
}
