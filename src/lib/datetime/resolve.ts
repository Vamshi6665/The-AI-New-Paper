/**
 * Deterministic date/time resolution (spec §7 steps 2-4). The model proposes;
 * this layer decides. Timezone-aware, reference-date-relative, and it NEVER
 * invents an exact time — "evening" stays part-of-day, not 6:00 PM.
 */

export interface ResolveContext {
  timezone: string;
  /** The reference "today" in the user's tz, as yyyy-mm-dd. */
  todayLocal: string;
}

export function todayInTz(timezone: string, at = new Date()): string {
  // en-CA formats as yyyy-mm-dd
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function addDays(dateLocal: string, days: number): string {
  const [y, m, d] = dateLocal.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 0=Sunday … 6=Saturday for a yyyy-mm-dd (tz-independent, date-only). */
export function weekdayOf(dateLocal: string): number {
  const [y, m, d] = dateLocal.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Resolve a relative date phrase against the reference date. Returns null when
 * the phrase has no date meaning (caller keeps the AI's date or flags missing).
 */
export function resolveRelativeDate(phrase: string, ctx: ResolveContext): string | null {
  const p = phrase.toLowerCase().trim();
  const today = ctx.todayLocal;

  if (/\btoday\b/.test(p)) return today;
  if (/\btomorrow\b/.test(p)) return addDays(today, 1);
  if (/\byesterday\b/.test(p)) return addDays(today, -1);
  if (/\bday after tomorrow\b/.test(p)) return addDays(today, 2);

  // "next <weekday>" / "this <weekday>" / bare "<weekday>"
  const wdMatch = p.match(/\b(next|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wdMatch) {
    const target = WEEKDAYS.indexOf(wdMatch[2]!);
    const cur = weekdayOf(today);
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7; // next occurrence, not today
    if (wdMatch[1] === 'next' && delta <= 7) delta += 0; // "next monday" == upcoming monday
    return addDays(today, delta);
  }

  // explicit yyyy-mm-dd
  const iso = p.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1]!;

  return null;
}

/** Normalize a clock string to 24h "HH:mm", or null if not an exact time. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) {
    // already "HH:mm"?
    const hm = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const h = Number(hm[1]);
      const mn = Number(hm[2]);
      if (h < 24 && mn < 60) return `${String(h).padStart(2, '0')}:${hm[2]}`;
    }
    return null;
  }
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function formatClock(time24: string | null): string | null {
  if (!time24) return null;
  const [h, m] = time24.split(':').map(Number);
  const mer = h! < 12 ? 'AM' : 'PM';
  const h12 = h! % 12 === 0 ? 12 : h! % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${mer}`;
}

export function formatDateDisplay(dateLocal: string): string {
  const [y, m, d] = dateLocal.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const PART_OF_DAY = ['morning', 'afternoon', 'evening', 'night'] as const;
export function detectPartOfDay(text: string): (typeof PART_OF_DAY)[number] | null {
  const p = text.toLowerCase();
  for (const part of PART_OF_DAY) if (p.includes(part)) return part;
  if (p.includes('noon')) return 'afternoon';
  if (p.includes('midnight')) return 'night';
  return null;
}
