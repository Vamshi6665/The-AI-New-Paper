import type { EventRecord, PartOfDay } from '@/types/event';

/**
 * Time suggestions. When something has no clock time ("go to the grocery store",
 * "watch a movie at night") the planner picks a sensible slot around what is
 * already fixed: inside the right part of the day, clear of other items with a
 * travel buffer. Suggestions are always flagged, never presented as the user's.
 */
export interface Slot {
  start: number; // minutes from midnight
  end: number;
}

const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
};

const WINDOW: Record<PartOfDay, [number, number]> = {
  morning: [8 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 21 * 60 + 30],
  night: [20 * 60 + 30, 23 * 60 + 30],
};

/** default length (min) when the user gave none */
export function defaultDuration(e: EventRecord): number {
  if (e.startTime && e.endTime) {
    const d = toMin(e.endTime) - toMin(e.startTime);
    if (d > 0) return d;
  }
  const t = `${e.title} ${e.description ?? ''}`;
  if (/\bgrocer|supermarket/i.test(t)) return 45;
  switch (e.category) {
    case 'fitness':
      return 60;
    case 'social':
      return /\b(visit|place|house|home|sister|brother|parents|family)\b/i.test(t) ? 180 : 90;
    case 'leisure':
      return /\bmovie|film\b/i.test(t) ? 120 : 60;
    case 'meeting':
    case 'medical':
    case 'appointment':
      return 45;
    case 'errand':
      return 45;
    case 'finance':
      return 15;
    case 'study':
      return 90;
    case 'meal':
      return 45;
    case 'birthday':
      return 15;
    default:
      return 60;
  }
}

/** where each kind of thing usually belongs when the user did not say */
function preferred(e: EventRecord): { part: PartOfDay; at: number } {
  const t = `${e.title} ${e.description ?? ''}`;
  if (e.partOfDay) {
    const [a] = WINDOW[e.partOfDay];
    // leisure at night: movie night starts around 9; evening social around 6:30
    if (e.category === 'leisure' && e.partOfDay === 'night') return { part: 'night', at: 21 * 60 };
    if (e.category === 'leisure' && e.partOfDay === 'evening') return { part: 'evening', at: 19 * 60 + 30 };
    if (e.category === 'social' && e.partOfDay === 'evening') return { part: 'evening', at: 18 * 60 };
    if (e.category === 'errand' && e.partOfDay === 'evening') return { part: 'evening', at: 18 * 60 };
    return { part: e.partOfDay, at: a };
  }
  if (/\bgrocer|supermarket|shopping/i.test(t)) return { part: 'afternoon', at: 16 * 60 + 30 };
  switch (e.category) {
    case 'errand':
      return { part: 'afternoon', at: 15 * 60 };
    case 'finance':
      return { part: 'morning', at: 10 * 60 };
    case 'study':
      return { part: 'morning', at: 9 * 60 + 30 };
    case 'leisure':
      return { part: 'night', at: 20 * 60 + 30 };
    case 'social':
      return { part: 'evening', at: 18 * 60 };
    case 'meal':
      return /breakfast/i.test(t)
        ? { part: 'morning', at: 8 * 60 }
        : /lunch|brunch/i.test(t)
          ? { part: 'afternoon', at: 12 * 60 + 30 }
          : { part: 'evening', at: 19 * 60 + 30 };
    case 'fitness':
      return { part: 'morning', at: 7 * 60 };
    default:
      return { part: 'morning', at: 10 * 60 + 30 };
  }
}

const BUFFER = 20; // travel / transition between items

export interface Placement {
  eventId: string;
  start: number;
  end: number;
}

/**
 * Place every un-timed event that deserves a time. Fixed (exact) events are
 * immovable; suggestions are packed greedily by priority then category weight.
 * Reminders and habits are left alone — they are nudges, not blocks.
 */
export function suggestPlacements(events: EventRecord[]): Placement[] {
  // `host` slots (a visit at someone's place) may be shared with a movie: you watch it there
  type B = Slot & { host?: boolean };
  const isHost = (e: EventRecord) => e.category === 'social' && /\b(visit|place|house|home|sister|brother|parents|family|friend)\b/i.test(`${e.title} ${e.description ?? ''}`);
  const busy: B[] = events
    .filter((e) => e.timePrecision === 'exact' && e.startTime)
    .map((e) => ({ start: toMin(e.startTime!), end: toMin(e.startTime!) + defaultDuration(e), host: isHost(e) }));

  const rank = (e: EventRecord) =>
    (e.priority === 'high' ? 0 : 1) * 10 +
    ({ medical: 0, appointment: 0, meeting: 1, errand: 2, finance: 3, study: 4, social: 5, leisure: 6 } as Record<string, number>)[e.category]!;

  const todo = events
    .filter((e) => e.timePrecision !== 'exact' || !e.startTime)
    .filter((e) => !['reminder', 'habit', 'birthday', 'deadline'].includes(e.category))
    .sort((a, b) => (rank(a) ?? 9) - (rank(b) ?? 9));

  const out: Placement[] = [];
  for (const e of todo) {
    const dur = defaultDuration(e);
    const pref = preferred(e);
    const [wa, wz] = WINDOW[pref.part];
    const movie = e.category === 'leisure';
    const free = (s: number) =>
      busy.every((b) => (movie && b.host) || s + dur + BUFFER <= b.start || s >= b.end + BUFFER) && s + dur <= 24 * 60;

    let found: number | null = null;
    // 1) preferred start inside its window, then later; 2) earlier inside the window; 3) anywhere reasonable
    for (let s = pref.at; s + dur <= wz + 90 && found === null; s += 15) if (s >= wa && free(s)) found = s;
    for (let s = pref.at - 15; s >= wa && found === null; s -= 15) if (free(s)) found = s;
    // still nothing: stay in the same half of the day before going anywhere
    const lateDay = pref.part === 'evening' || pref.part === 'night';
    const [fa, fz] = lateDay ? [17 * 60, 23 * 60] : [8 * 60, 22 * 60 + 30];
    for (let s = fa; s + dur <= fz + 60 && found === null; s += 15) if (free(s)) found = s;
    for (let s = 8 * 60; s + dur <= 22 * 60 + 30 && found === null; s += 15) if (free(s)) found = s;
    if (found !== null) {
      busy.push({ start: found, end: found + dur, host: isHost(e) });
      out.push({ eventId: e.id, start: found, end: found + dur });
    }
  }
  return out;
}
