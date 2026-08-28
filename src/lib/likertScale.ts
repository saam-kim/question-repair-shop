export const DEFAULT_LIKERT_LABELS = [
  '전혀 그렇지 않다',
  '그렇지 않다',
  '보통이다',
  '그렇다',
  '매우 그렇다',
] as const;

export const LIKERT_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: DEFAULT_LIKERT_LABELS[0],
  2: DEFAULT_LIKERT_LABELS[1],
  3: DEFAULT_LIKERT_LABELS[2],
  4: DEFAULT_LIKERT_LABELS[3],
  5: DEFAULT_LIKERT_LABELS[4],
};

export const LIKERT_VALUES = [1, 2, 3, 4, 5] as const;

export function getLikertLabels(customLabels?: string[]): string[] {
  if (customLabels && customLabels.length === 5 && customLabels.some((l) => l.trim().length > 0)) {
    return customLabels.map((l, i) => l.trim() || DEFAULT_LIKERT_LABELS[i]);
  }
  return [...DEFAULT_LIKERT_LABELS];
}

export function formatLikertResponse(
  value: number | string,
  customLabels?: string[],
): string {
  if (typeof value === 'string' && value.startsWith('기타:')) {
    return value;
  }
  const num = Number(value);
  if (num >= 1 && num <= 5) {
    const labels = getLikertLabels(customLabels);
    return `${num}. ${labels[num - 1]}`;
  }
  return String(value);
}
