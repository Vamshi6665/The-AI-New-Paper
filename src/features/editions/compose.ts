import { createHash } from 'node:crypto';
import type { EventRecord } from '@/types/event';
import type { AgendaRow, Edition, EditionItem, EventBrief, Glance, NewspaperSection, SectionItem } from '@/types/edition';
import { buildBrief, buildDayPlan, groupFor } from './plan';
import { suggestPlacements } from './schedule';
import { CATEGORY_LABEL } from '@/types/event';
import { formatClock, formatDateDisplay } from '@/lib/datetime/resolve';
import { openWindows, fmtLen, clockOf } from './windows';

/**
 * Compose the newspaper document model from events (spec §11). The database /
 * normalized events are the system of record; this builds a *rendering* and
 * then PROVES every eligible event is represented (spec §12, zero-missing).
 */

function timeLabel(e: EventRecord): string {
  if (e.timePrecision === 'exact' && e.startTime) return formatClock(e.startTime)!;
  if (e.timePrecision === 'partofday' && e.partOfDay)
    return e.partOfDay.charAt(0).toUpperCase() + e.partOfDay.slice(1);
  return 'Anytime';
}

function detailLine(e: EventRecord): string {
  const bits: string[] = [];
  if (e.location) bits.push(e.location);
  if (e.person) bits.push(`with ${e.person}`);
  if (e.description) bits.push(e.description);
  if (e.endTime && e.startTime) bits.push(`until ${formatClock(e.endTime)}`);
  return bits.join(' · ') || CATEGORY_LABEL[e.category];
}

// ---- glance (spec §6 §3) — counts from structured data only ----
function buildGlance(events: EventRecord[]): Glance {
  const timed = events.filter((e) => e.timePrecision === 'exact' && e.startTime);
  const workout = events.filter((e) => e.category === 'fitness');
  let workoutMinutes: number | null = null;
  for (const w of workout) {
    if (w.startTime && w.endTime) {
      const [sh, sm] = w.startTime.split(':').map(Number);
      const [eh, em] = w.endTime.split(':').map(Number);
      const mins = eh! * 60 + em! - (sh! * 60 + sm!);
      if (mins > 0) workoutMinutes = (workoutMinutes ?? 0) + mins;
    }
  }
  const sorted = [...timed].sort((a, b) => a.startTime!.localeCompare(b.startTime!));
  return {
    totalActivities: events.length,
    appointments: events.filter((e) => ['medical', 'appointment', 'meeting'].includes(e.category)).length,
    tasks: events.filter((e) => ['task', 'errand', 'deadline', 'finance'].includes(e.category)).length,
    reminders: events.filter((e) => e.reminderAt || e.category === 'reminder').length,
    workoutMinutes,
    earliest: sorted[0] ? formatClock(sorted[0].startTime!) : null,
    latest: sorted.length ? formatClock(sorted[sorted.length - 1]!.startTime!) : null,
  };
}

// ---- lead headline (factual, spec §6 §2) ----
function leadHeadline(events: EventRecord[], glance: Glance): string {
  if (events.length === 0) return 'A Clear Day Ahead: Time to Plan';
  const cats = new Set(events.map((e) => e.category));
  const hasWork = cats.has('meeting');
  const hasHealth = cats.has('fitness') || cats.has('medical');
  const hasCelebration = cats.has('birthday');
  if (hasCelebration && hasWork) return 'A Day of Work and Celebration';
  if (hasHealth && hasWork) return 'Health and Work Share the Day';
  if (glance.appointments >= 2) return 'A Busy Day Ahead: Appointments in Focus';
  if (hasHealth) return 'Health Takes Center Stage Today';
  if (hasWork) return 'Meetings and Progress on the Agenda';
  if (glance.totalActivities >= 4) return 'A Full and Productive Day Awaits';
  return 'Your Day, Planned and Ready';
}

function sectionFor(category: string): NewspaperSection['type'] {
  if (category === 'fitness') return 'fitness';
  if (category === 'birthday') return 'celebrations';
  if (['medical', 'appointment'].includes(category)) return 'appointments';
  if (category === 'meeting') return 'work';
  return 'tasks';
}

export function composeEdition(input: {
  events: EventRecord[];
  editionDate: string;
  masthead?: string;
  editionNo?: number;
  quote?: { text: string; author: string } | null;
  leadHeadline?: string;
  leadBody?: string;
  calorieTarget?: number | null;
  movies?: { title: string; note: string }[] | null;
  /** optional richer briefs (e.g. AI-written) keyed by event id; merged over the deterministic ones */
  briefOverrides?: Record<string, Partial<EventBrief>>;
}): Edition {
  const events = input.events.filter((e) => e.status !== 'cancelled');
  const sourceEventIds = events.map((e) => e.id);
  const glance = buildGlance(events);

  const sections: NewspaperSection[] = [];

  // --- Tomorrow at a Glance ---
  const glanceLines = [
    `${glance.totalActivities} planned ${glance.totalActivities === 1 ? 'activity' : 'activities'}`,
    `${glance.appointments} appointment${glance.appointments === 1 ? '' : 's'}`,
    `${glance.tasks} personal task${glance.tasks === 1 ? '' : 's'}`,
    `${glance.reminders} reminder${glance.reminders === 1 ? '' : 's'}`,
  ];
  if (glance.workoutMinutes) glanceLines.push(`${glance.workoutMinutes} min of planned exercise`);
  if (glance.earliest) glanceLines.push(`First event ${glance.earliest}`);
  if (glance.latest && glance.latest !== glance.earliest) glanceLines.push(`Last event ${glance.latest}`);
  sections.push({
    type: 'glance',
    title: 'The Day at a Glance',
    items: [{ lines: glanceLines, eventIds: [] }],
    eventIds: [],
  });

  // --- Agenda (every timed + part-of-day event), chronological ---
  const agendaRows: AgendaRow[] = events
    .filter((e) => e.timePrecision !== 'none')
    .slice()
    .sort((a, b) => {
      // exact times first (by clock), then part-of-day in day order
      const rank = (e: EventRecord) => (e.timePrecision === 'exact' && e.startTime ? 0 : 1);
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      const order = ['morning', 'afternoon', 'evening', 'night'];
      return order.indexOf(a.partOfDay ?? '') - order.indexOf(b.partOfDay ?? '');
    })
    .map((e) => ({ time: timeLabel(e), title: e.title, details: detailLine(e), eventId: e.id }));
  const anytime = events.filter((e) => e.timePrecision === 'none');
  sections.push({
    type: 'agenda',
    title: "Today's Agenda",
    rows: agendaRows,
    items: anytime.length
      ? [
          {
            heading: 'Anytime Today',
            lines: anytime.map((e) => e.title),
            eventIds: anytime.map((e) => e.id),
          },
        ]
      : [],
    eventIds: [...agendaRows.map((r) => r.eventId), ...anytime.map((e) => e.id)],
  });

  // --- Specialized sections ---
  const grouped = new Map<NewspaperSection['type'], EventRecord[]>();
  for (const e of events) {
    const t = sectionFor(e.category);
    if (!grouped.has(t)) grouped.set(t, []);
    grouped.get(t)!.push(e);
  }

  const specTitles: Partial<Record<NewspaperSection['type'], string>> = {
    fitness: 'Health & Fitness',
    celebrations: 'Celebrations & Birthdays',
    appointments: 'Appointments & Commitments',
    work: 'Work, Projects & Meetings',
    tasks: 'Personal To-Do Bulletin',
  };

  for (const [type, title] of Object.entries(specTitles) as [NewspaperSection['type'], string][]) {
    const evs = grouped.get(type);
    if (!evs || evs.length === 0) continue;
    const items: SectionItem[] = evs.map((e) => {
      const lines: string[] = [];
      const when = timeLabel(e);
      if (when !== 'Anytime') lines.push(when === e.title ? when : `${when}`);
      lines.push(detailLine(e));
      if (e.reminderAt) lines.push(`Reminder set for ${formatClock(e.reminderAt)}`);
      return {
        heading: e.title,
        lines: lines.filter(Boolean),
        checklist: e.checklist?.length ? e.checklist : undefined,
        eventIds: [e.id],
      };
    });
    sections.push({ type, title, items, eventIds: evs.map((e) => e.id) });
  }

  // --- Reminders digest ---
  const reminders = events.filter((e) => e.reminderAt || e.priority === 'high' || e.category === 'deadline');
  if (reminders.length) {
    sections.push({
      type: 'reminders',
      title: 'Important Reminders',
      items: reminders.map((e) => ({
        lines: [
          `${e.title}${e.reminderAt ? ` — ${formatClock(e.reminderAt)}` : e.timePrecision === 'exact' ? ` — ${formatClock(e.startTime)}` : ''}`,
        ],
        eventIds: [e.id],
      })),
      eventIds: reminders.map((e) => e.id),
    });
  }

  // --- Editor's Note (factual summary only) ---
  sections.push({
    type: 'editorsNote',
    title: "Editor's Note",
    items: [{ lines: [editorsNote(events, glance)], eventIds: [] }],
    eventIds: [],
  });

  // ---- ZERO-MISSING-EVENT CHECK (spec §12) ----
  // The agenda + specialized sections must cover every source event. Glance,
  // reminders, and editor's note are derived views and don't count as coverage.
  const coveringSections: NewspaperSection['type'][] = [
    'agenda',
    'fitness',
    'celebrations',
    'appointments',
    'work',
    'tasks',
  ];
  const represented = new Set<string>();
  for (const s of sections) {
    if (coveringSections.includes(s.type)) for (const id of s.eventIds) represented.add(id);
  }
  const representedEventIds = [...represented];
  const missingEventIds = sourceEventIds.filter((id) => !represented.has(id));

  // ---- fully detailed items (what the one-page paper renders) ----
  const celebrant = events.find((e) => e.category === 'birthday')?.person ?? null;
  const hasCelebration = events.some((e) => e.category === 'birthday');
  const hasVisit = events.some((e) => e.category === 'social');
  const hasMovie = events.some((e) => e.category === 'leisure' && /\b(movie|film)\b/i.test(`${e.title} ${e.description ?? ''}`));
  const placed = new Map(suggestPlacements(events).map((p) => [p.eventId, p]));
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const items: EditionItem[] = events.map((e) => {
    const group = groupFor(e, hasCelebration);
    const p = placed.get(e.id);
    // plan around the suggested slot too, so leave-by / prep times make sense
    const planned: EventRecord = p ? { ...e, startTime: hhmm(p.start), endTime: hhmm(Math.min(p.end, 24 * 60 - 1)) } : e;
    const base = buildBrief(planned, group, {
      celebrating: celebrant,
      movies: input.movies ?? null,
      seed: input.editionDate,
      hasVisit,
      hasMovie,
    });
    const o = input.briefOverrides?.[e.id];
    const brief: EventBrief = o
      ? {
          ...base,
          blurb: o.blurb || base.blurb,
          steps: o.steps?.length ? o.steps : base.steps,
          checklist: o.checklist?.length ? o.checklist : base.checklist,
        }
      : base;
    const exact = e.timePrecision === 'exact' && !!e.startTime;
    return {
      eventId: e.id,
      title: e.title,
      category: e.category,
      group,
      timeLabel: exact ? timeLabel(e) : p ? formatClock(hhmm(p.start))! : timeLabel(e),
      startTime: exact ? e.startTime : p ? hhmm(p.start) : e.startTime,
      endTime: exact ? (e.endTime ?? (p ? hhmm(Math.min(p.end, 24 * 60 - 1)) : null)) : p ? hhmm(Math.min(p.end, 24 * 60 - 1)) : e.endTime,
      exact,
      suggested: !exact && !!p,
      endLabel: exact ? (e.endTime ? formatClock(e.endTime) : p ? formatClock(hhmm(Math.min(p.end, 24 * 60 - 1))) : null) : p ? formatClock(hhmm(Math.min(p.end, 24 * 60 - 1))) : null,
      location: e.location,
      person: e.person,
      priority: e.priority,
      reminder: e.reminderAt ? formatClock(e.reminderAt) : null,
      brief,
    };
  });
  const POD = ['morning', 'afternoon', 'evening', 'night'];
  const podOf = new Map(events.map((e) => [e.id, e.partOfDay]));
  const rank = (i: EditionItem) => (i.startTime ? 0 : i.timeLabel === 'Anytime' ? 2 : 1);
  items.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    return POD.indexOf(podOf.get(a.eventId) ?? '') - POD.indexOf(podOf.get(b.eventId) ?? '');
  });
  const lastEndMin = Math.max(
    0,
    ...items.filter((i) => i.startTime).map((i) => {
      const t = i.endTime ?? i.startTime!;
      return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    })
  );
  const plan = buildDayPlan(events, { calorieTarget: input.calorieTarget, lastEndMin });
  // the header must describe the page: first/last of ALL placed items, suggested ones included
  const timedItems = items.filter((i) => i.startTime);
  if (timedItems.length) {
    plan.firstMove = timedItems[0]!.timeLabel;
    plan.lastItem = timedItems[timedItems.length - 1]!.timeLabel;
  }

  const dateDisplay = formatDateDisplay(input.editionDate);
  const edition: Edition = {
    id:
      'ed_' +
      createHash('sha1')
        .update(input.editionDate + sourceEventIds.join(','))
        .digest('hex')
        .slice(0, 12),
    userId: events[0]?.userId ?? 'demo-user',
    editionDate: input.editionDate,
    dateDisplay,
    editionNo: input.editionNo ?? 1,
    masthead: input.masthead ?? 'The Daily Edition',
    tagline: 'Your life. Your headlines. Your tomorrow.',
    quote: input.quote ?? null,
    leadHeadline: input.leadHeadline ?? headlineFrom(items, events),
    leadBody: input.leadBody ?? storyFrom(items, plan),
    sections,
    items,
    plan,
    sourceEventIds,
    representedEventIds,
    missingEventIds,
    generatedAt: new Date().toISOString(),
    contentHash: createHash('sha1')
      .update(JSON.stringify(events.map((e) => ({ ...e, createdAt: 0, updatedAt: 0 }))))
      .digest('hex')
      .slice(0, 16),
  };
  return edition;
}

/** A short front-page story body summarizing the day (the "Your Say" lead). */
function frontStory(events: EventRecord[], glance: Glance): string {
  if (events.length === 0)
    return 'The day lies open and unwritten. Nothing is yet on the schedule — a rare and quiet luxury.';
  const timed = events.filter((e) => e.timePrecision === 'exact' && e.startTime);
  const first = timed[0];
  const bits: string[] = [];
  if (first)
    bits.push(
      `The day opens at ${formatClock(first.startTime!)} with ${first.title.toLowerCase()}, setting the pace for what follows.`
    );
  if (glance.appointments)
    bits.push(
      `${glance.appointments} commitment${glance.appointments === 1 ? '' : 's'} anchor the hours ahead, and ${glance.tasks} personal ${glance.tasks === 1 ? 'task waits' : 'tasks wait'} in the margins.`
    );
  if (events.some((e) => e.category === 'birthday')) bits.push('A celebration lends the evening its warmth.');
  bits.push('Read on for the full order of the day.');
  return bits.join(' ');
}

function editorsNote(events: EventRecord[], glance: Glance): string {
  if (events.length === 0)
    return 'No plans are on the books yet. Tell me what the day holds and your edition will take shape.';
  const parts: string[] = [];
  if (glance.appointments)
    parts.push(`${glance.appointments} commitment${glance.appointments === 1 ? '' : 's'} to keep`);
  if (events.some((e) => e.category === 'fitness')) parts.push('time set aside for fitness');
  if (events.some((e) => e.category === 'birthday')) parts.push('a celebration to honor');
  const tail = parts.length ? parts.join(', ') : 'a manageable set of tasks';
  return `The day holds ${tail}. Work it top to bottom, keep water close, and protect your sleep.`;
}

/**
 * The guarantee check, surfaced for the API/tests. Returns the missing IDs so
 * the caller can fail generation or append a labeled "missing" block (spec §12).
 */
export function verifyCoverage(edition: Edition): { ok: boolean; missing: string[] } {
  return { ok: edition.missingEventIds.length === 0, missing: edition.missingEventIds };
}


// ---- data-driven front page (replaces template copy) ----
const shortTime = (label: string) => label.replace(':00', '').replace(' ', '\u00a0');
const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
function shortTitle(i: EditionItem): string {
  if (/\b(movie|film)\b/i.test(i.title)) return 'movie night';
  return lc(i.title.replace(/^(?:my|the)\s+/i, '').replace(/\s+(?:session|workout)$/i, ' workout').replace(/\s+at the gym$/i, ''));
}

function headlineFrom(items: EditionItem[], events: EventRecord[]): string {
  if (events.length === 0) return 'A Clear Day Ahead';
  const timed = items.filter((i) => i.startTime);
  if (timed.length === 0) return `${events.length} ${events.length === 1 ? 'Item' : 'Items'} on Your List Today`;
  const first = timed[0]!;
  const last = timed[timed.length - 1]!;
  if (timed.length === 1) return `${cap(shortTitle(first))} at ${shortTime(first.timeLabel)}`;
  return `${cap(shortTitle(first))} at ${shortTime(first.timeLabel)}, ${shortTitle(last)} by ${shortTime(last.timeLabel)}`;
}

function storyFrom(items: EditionItem[], plan: Edition['plan']): string {
  if (items.length === 0) return 'The day lies open and unwritten. Tell me what is coming up and I will set it in type.';
  const seq = items.map((i) => `${lc(i.title)} (${i.suggested ? '~' : ''}${shortTime(i.timeLabel)})`);
  const list = seq.length > 1 ? `${seq.slice(0, -1).join(', ')} and ${seq[seq.length - 1]}` : seq[0];
  const parts = [`${items.length} ${items.length === 1 ? 'thing' : 'things'} today: ${list}.`];
  if (plan.calories) parts.push(`Fuel: ${plan.calories.target.toLocaleString('en-US')} kcal across ${plan.calories.meals.length} meals, ${plan.waterLiters} L of water.`);
  const best = openWindows(items, 90).sort((a, b) => b.len - a.len)[0];
  if (best) parts.push(`Longest open stretch: ${clockOf(best.from)} to ${clockOf(best.to)} (${fmtLen(best.len)}).`);
  return parts.join(' ');
}
