import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-2px_rgba(30,64,175,0.08)] ${className}`}>
      {children}
    </div>
  );
}
