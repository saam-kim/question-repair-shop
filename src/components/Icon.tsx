const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  book: 'M12 5v15M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7.87a4 4 0 0 1 0 7.75',
  clock: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  edit: 'm16 3 5 5M4 20l4-1L21 6a2 2 0 0 0-3-3L5 16Zm0 0h16',
  message: 'M21 11a8 8 0 0 1-8 8H7l-4 3V5a2 2 0 0 1 2-2h8a8 8 0 0 1 8 8M7 8h9M7 12h6',
  pause: 'M8 5v14M16 5v14',
  close: 'm6 6 12 12M6 18 18 6',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  qr: 'M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h2v2h-2Zm4 4h2v2h-2ZM15 21v-2m6-4h-2',
  alert: 'm12 3 10 18H2Zm0 6v5m0 3v.1',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
} as const;

export function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg
      className={`inline-block h-5 w-5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
