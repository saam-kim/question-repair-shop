import type { ReactNode } from 'react';

export function BottomActionBar({
  onClick,
  disabled,
  children,
  secondary,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-center gap-4 border-t border-slate-100 bg-white px-8 py-4">
      {secondary}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="min-w-72 rounded-2xl bg-blue-600 px-8 py-4 text-xl font-semibold text-white shadow-[0_4px_14px_-2px_rgba(37,99,235,0.4)] transition-all
          hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {children}
      </button>
    </footer>
  );
}
