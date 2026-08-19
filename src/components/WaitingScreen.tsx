export function WaitingScreen({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl animate-pulse" aria-hidden>🔎</div>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description && <p className="max-w-md text-slate-500">{description}</p>}
    </div>
  );
}
