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
    <footer className="action-bar">
      {secondary}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="btn-primary w-full sm:w-auto sm:min-w-64"
      >
        {children}
      </button>
    </footer>
  );
}
