import { Icon } from './Icon';

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="notice">
      <Icon name="alert" />
      <span>{children}</span>
    </div>
  );
}
