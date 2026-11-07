import type { EditionItem } from '@/types/edition';

const toMin = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export interface OpenWindow {
  from: number;
  to: number;
  len: number;
}

/** Gaps of an hour or more between the day's first item and last item. */
export function openWindows(items: Pick<EditionItem, 'startTime' | 'endTime' | 'group'>[], minLen = 60): OpenWindow[] {
  const spans = items
    .filter((i) => i.startTime)
    .map((i) => {
      const s = toMin(i.startTime!);
      const e = i.endTime ? toMin(i.endTime) : s + (i.group === 'fitness' ? 60 : 30);
      return [s, Math.max(e, s + 15)] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  const out: OpenWindow[] = [];
  let cur = spans[0]?.[1] ?? 0;
  for (let k = 1; k < spans.length; k++) {
    const [s, e] = spans[k]!;
    if (s - cur >= minLen) out.push({ from: cur, to: s, len: s - cur });
    cur = Math.max(cur, e);
  }
  return out;
}

export const fmtLen = (m: number): string => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
};

export const clockOf = (m: number): string => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
