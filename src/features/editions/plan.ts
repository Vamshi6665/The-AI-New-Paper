import type { EventRecord } from '@/types/event';
import type { DayPlan, EventBrief, ItemGroup } from '@/types/edition';
import { formatClock } from '@/lib/datetime/resolve';

/**
 * Detailed planning layer. Turns a bare event ("gym at 7") into something a
 * person can actually follow: a workout with sets, a leave-by time for the
 * doctor, a prep list for the birthday, a fuel and water plan for the day.
 *
 * Everything here is deterministic and works with no API key. These are general
 * wellness guides, not medical advice; the paper labels them as suggestions.
 */

// ---------- time helpers ----------
const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
};
const fromMin = (m: number): string => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
const clock = (m: number): string => formatClock(fromMin(m))!;

const has = (e: EventRecord, re: RegExp) => re.test(`${e.title} ${e.description ?? ''}`);

// ---------- grouping ----------
export function groupFor(e: EventRecord, hasCelebration: boolean): ItemGroup {
  if (e.category === 'fitness') return 'fitness';
  if (e.category === 'birthday') return 'celebration';
  // "pick up the cake / buy a gift" belongs with the celebration it serves
  if (hasCelebration && has(e, /\b(cake|gift|present|card|flowers?|balloons?|decorat\w*)\b/i)) return 'celebration';
  if (e.category === 'medical' || e.category === 'appointment') return 'appointment';
  if (e.category === 'meeting') return 'work';
  if (has(e, /\b(slides?|presentation|report|proposal|essay|assignment|deck|spreadsheet|code|deploy)\b/i))
    return 'work';
  return 'task';
}

// ---------- workouts ----------
type Plan = { kind: string; steps: string[]; burnPerMin: number; sets: number };

function workoutFor(e: EventRecord): Plan {
  const t = `${e.title} ${e.description ?? ''}`.toLowerCase();
  const warm = 'Warm-up — 8 min mobility + light cardio';
  const cool = 'Cool-down — 5 min stretch, slow breathing';
  if (/\b(leg|legs|squat|lower body)\b/.test(t))
    return {
      kind: 'Leg day',
      burnPerMin: 7,
      sets: 17,
      steps: [warm, 'Back squat — 4 × 8', 'Romanian deadlift — 3 × 10', 'Walking lunges — 3 × 12 / leg', 'Leg press — 3 × 12', 'Calf raises — 4 × 15', cool],
    };
  if (/\b(chest|bench|push)\b/.test(t))
    return {
      kind: 'Push day',
      burnPerMin: 6.5,
      sets: 16,
      steps: [warm, 'Bench press — 4 × 8', 'Incline dumbbell press — 3 × 10', 'Cable fly — 3 × 12', 'Shoulder press — 3 × 10', 'Triceps pushdown — 3 × 12', cool],
    };
  if (/\b(back|pull|deadlift)\b/.test(t))
    return {
      kind: 'Pull day',
      burnPerMin: 6.5,
      sets: 16,
      steps: [warm, 'Deadlift — 3 × 5', 'Pull-ups — 4 × max', 'Barbell row — 4 × 10', 'Lat pulldown — 3 × 12', 'Face pulls — 3 × 15', cool],
    };
  if (/\b(arms?|biceps?|triceps?|shoulders?)\b/.test(t))
    return {
      kind: 'Arms & shoulders',
      burnPerMin: 5.5,
      sets: 15,
      steps: [warm, 'Overhead press — 4 × 8', 'Lateral raise — 3 × 15', 'Barbell curl — 3 × 12', 'Skull crushers — 3 × 12', 'Hammer curl — 2 × 12', cool],
    };
  if (/\b(run|running|jog|jogging|cardio|treadmill)\b/.test(t))
    return {
      kind: 'Cardio run',
      burnPerMin: 10,
      sets: 0,
      steps: ['Warm-up — 5 min brisk walk', 'Steady run — 25 min, easy pace (you can talk)', 'Strides — 4 × 30 sec fast', cool],
    };
  if (/\b(yoga|stretch|pilates|mobility)\b/.test(t))
    return {
      kind: 'Mobility flow',
      burnPerMin: 3.5,
      sets: 0,
      steps: ['Centering — 3 min breath work', 'Sun salutations — 6 rounds', 'Hips & hamstrings — 8 min holds', 'Spine & shoulders — 6 min flow', 'Savasana — 3 min'],
    };
  if (/\b(swim|swimming)\b/.test(t))
    return {
      kind: 'Swim',
      burnPerMin: 9,
      sets: 0,
      steps: ['Warm-up — 200 m easy', 'Drills — 4 × 50 m', 'Main set — 6 × 100 m, 20 sec rest', cool],
    };
  if (/\b(cycle|cycling|bike|biking|spin)\b/.test(t))
    return {
      kind: 'Ride',
      burnPerMin: 8,
      sets: 0,
      steps: ['Warm-up — 10 min easy spin', 'Intervals — 5 × 3 min hard, 2 min easy', 'Steady — 15 min moderate', cool],
    };
  return {
    kind: 'Full-body strength',
    burnPerMin: 6.5,
    sets: 17,
    steps: [warm, 'Squat — 4 × 8', 'Push-ups or bench — 4 × 8', 'Row — 3 × 10', 'Overhead press — 3 × 10', 'Plank — 3 × 45 sec', cool],
  };
}

// ---------- per-event briefs ----------
const DEFAULT_MIN: Record<string, number> = {
  fitness: 60,
  meeting: 45,
  medical: 45,
  appointment: 45,
  errand: 45,
  finance: 10,
  study: 90,
  task: 60,
};

function durationMin(e: EventRecord): number {
  if (e.startTime && e.endTime) {
    const d = toMin(e.endTime) - toMin(e.startTime);
    if (d > 0) return d;
  }
  return DEFAULT_MIN[e.category] ?? 30;
}

function mins(n: number): string {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const GROCERY_STARTER = [
  'Fresh vegetables & greens',
  'Fruit (2–3 kinds)',
  'Protein — eggs, chicken, tofu or beans',
  'Milk or yogurt',
  'Rice, oats or bread',
  'Healthy snacks & water',
];

export function buildBrief(e: EventRecord, group: ItemGroup, ctx: { celebrating: string | null }): EventBrief {
  const start = e.startTime ? toMin(e.startTime) : null;
  const dur = durationMin(e);
  const own = e.checklist.map((c) => c.title);
  const metrics: { label: string; value: string }[] = [];
  let blurb = '';
  let steps: string[] = [];
  let checklist: string[] = [...own];

  const addLeave = (travel: number, early: number, label = 'Leave by') => {
    if (start !== null) metrics.push({ label, value: clock(start - travel - early) });
  };

  if (group === 'fitness') {
    const w = workoutFor(e);
    blurb = `${w.kind}. Train hard, stay clean on form, finish with a stretch.`;
    steps = w.steps;
    metrics.push({ label: 'Duration', value: mins(dur) });
    metrics.push({ label: 'Est. burn', value: `${Math.round((dur * w.burnPerMin) / 10) * 10 - 50}–${Math.round((dur * w.burnPerMin) / 10) * 10 + 50} kcal` });
    if (w.sets) metrics.push({ label: 'Total sets', value: String(w.sets) });
    addLeave(15, 5);
    if (!checklist.length) checklist = ['Water bottle (500 ml)', 'Towel & gym shoes', 'Headphones / workout playlist', 'Light pre-workout snack'];
  } else if (e.category === 'medical' || has(e, /\b(doctor|dentist|clinic|hospital|checkup|check-up|physio)\b/i)) {
    blurb = `Be early, be prepared, get your questions answered.${e.person ? ` Appointment with ${e.person}.` : ''}`;
    steps = [
      'Night before — confirm the time and office address',
      'Leave early — allow traffic and parking',
      'Check in 15 min before the slot',
      'Ask your questions, then note the next steps',
    ];
    addLeave(25, 15);
    if (start !== null) metrics.push({ label: 'Check in', value: clock(start - 15) });
    metrics.push({ label: 'Allow', value: mins(Math.max(dur, 45)) });
    if (!checklist.length)
      checklist = ['Photo ID & insurance card', 'List of current medications', 'Questions & symptoms written down', 'Previous reports or test results', 'Payment method for the co-pay'];
  } else if (group === 'celebration' && e.category === 'birthday') {
    const who = e.person ?? 'them';
    blurb = `${e.person ? `${e.person}'s day` : 'A celebration'} — a moment worth being present for.`;
    steps = [
      `Make the call / send the wish — ${e.reminderAt ? clock(toMin(e.reminderAt)) : e.startTime ? clock(start!) : 'pick a time'}`,
      `Say one specific thing you value about ${who}`,
      'Plan the celebration — where, who, what time',
      'Take a photo to remember the moment',
    ];
    if (e.reminderAt) metrics.push({ label: 'Call at', value: clock(toMin(e.reminderAt)) });
    else if (start !== null) metrics.push({ label: 'At', value: clock(start) });
    if (e.person) metrics.push({ label: 'For', value: e.person });
    if (!checklist.length) checklist = ['Cake ordered or collected', 'Gift or handwritten card', 'Wish message ready', 'Phone charged for the call'];
  } else if (group === 'celebration') {
    blurb = ctx.celebrating ? `Celebration prep for ${ctx.celebrating}.` : 'Celebration prep.';
    steps = ['Confirm the order or the shop hours', 'Collect it before the evening rush', 'Keep it safe and cool until the celebration'];
    addLeave(15, 5);
    metrics.push({ label: 'Allow', value: mins(30) });
  } else if (group === 'work' && e.category === 'meeting') {
    blurb = 'Walk in with a goal, walk out with owners and dates.';
    steps = [
      `Prep — ${start !== null ? clock(start - 10) : '10 min before'}: skim notes & agenda`,
      'Write the one decision you need from this meeting',
      'During — capture actions with owners',
      'After — send a 3-line recap',
    ];
    metrics.push({ label: 'Duration', value: mins(dur) });
    if (start !== null) metrics.push({ label: 'Prep at', value: clock(start - 10) });
    if (!checklist.length) checklist = ['Agenda & notes open', 'Slides / materials ready', 'Meeting link or room checked'];
  } else if (group === 'work') {
    blurb = 'Deep work: define done, protect the block, ship it.';
    steps = ['Define "done" in one sentence', 'Focus block 1 — 45 min, phone away', 'Break — 10 min, walk and water', 'Focus block 2 — 45 min, then review'];
    metrics.push({ label: 'Plan', value: '2 × 45 min' });
    if (!checklist.length) checklist = ['Close messages & tabs', 'Outline the 3 key points', 'Final read-through & export'];
  } else if (has(e, /\b(grocer\w*|supermarket|shopping)\b/i)) {
    blurb = 'Shop once, shop smart — a list means nothing is forgotten.';
    steps = ['Check the pantry and fridge first', 'Group the list by aisle', 'Stick to the list; carry your own bags'];
    metrics.push({ label: 'Allow', value: mins(dur) });
    if (!checklist.length) {
      checklist = GROCERY_STARTER;
      metrics.push({ label: 'List', value: 'starter — edit' });
    }
  } else if (e.category === 'finance' || has(e, /\b(bill|rent|tax|invoice|payment)\b/i)) {
    blurb = 'Ten minutes now saves a late fee later.';
    steps = ['Open the account or app', 'Confirm the amount and due date', 'Pay and screenshot the confirmation'];
    metrics.push({ label: 'Allow', value: mins(10) });
    if (!checklist.length) checklist = ['Amount confirmed', 'Payment sent', 'Confirmation saved'];
  } else if (has(e, /\b(laundry|clothes|wash)\b/i)) {
    blurb = 'Start early, fold while a show plays.';
    steps = ['Sort whites and colours', 'Wash — about 45 min', 'Dry — about 60 min', 'Fold and put away'];
    metrics.push({ label: 'Total', value: '≈ 2 h (hands-on 15 min)' });
  } else if (e.category === 'study') {
    blurb = 'Short, focused sessions beat one long slog.';
    steps = ['Pick one topic for this session', 'Session 1 — 50 min, notes only', 'Session 2 — 40 min, recall without looking', 'Review the key points in 5 min'];
    metrics.push({ label: 'Plan', value: mins(dur) });
  } else if (e.category === 'travel') {
    blurb = 'Leave margin, carry the essentials.';
    steps = ['Check the route and timing', 'Pack documents & chargers', 'Leave with a 20 min buffer'];
    addLeave(0, 20);
    if (!checklist.length) checklist = ['ID / tickets', 'Phone & charger', 'Water & snack'];
  } else if (e.category === 'social') {
    blurb = 'Good company deserves your full attention.';
    steps = ['Confirm the place and time', 'Plan your travel time', 'Phone away once you arrive'];
    addLeave(20, 5);
  } else if (e.category === 'meal') {
    blurb = 'Fuel on purpose.';
    steps = ['Protein first, then vegetables, then carbs', 'Drink a glass of water before'];
  } else if (e.category === 'reminder' || e.category === 'deadline') {
    blurb = e.category === 'deadline' ? 'Hard stop — plan to finish early.' : 'A nudge, so it does not slip.';
    steps = ['Do the first 5-minute step right away', 'Set a phone alarm for the time', 'Mark it done'];
    if (start !== null) metrics.push({ label: 'At', value: clock(start) });
  } else {
    blurb = 'Small and doable — knock it out and cross it off.';
    steps = ['Decide the very first action', 'Do it before opening messages', 'Tick it off'];
    metrics.push({ label: 'Allow', value: mins(dur) });
  }

  return { blurb, steps, checklist: checklist.slice(0, 8), metrics: metrics.slice(0, 4) };
}

// ---------- day plan: rhythm, fuel, water ----------
const round10 = (n: number) => Math.round(n / 10) * 10;

export function parseCalorieTarget(text: string): number | null {
  const m = [...text.matchAll(/(\d[\d,]{2,5})\s*(?:k?cal(?:ories?)?\b)/gi)]
    .map((x) => Number(x[1]!.replace(/,/g, '')))
    .filter((n) => n >= 1200 && n <= 6000);
  return m.length ? Math.max(...m) : null;
}

export function buildDayPlan(events: EventRecord[], opts: { calorieTarget?: number | null } = {}): DayPlan {
  const timed = events
    .filter((e) => e.timePrecision === 'exact' && e.startTime)
    .sort((a, b) => a.startTime!.localeCompare(b.startTime!));
  const first = timed[0];
  const last = timed[timed.length - 1];
  const workouts = events.filter((e) => e.category === 'fitness');
  const trains = workouts.length > 0;

  // wake: enough runway before the first thing; never before 5:00
  let wake = 7 * 60;
  if (first) {
    const lead = first.category === 'fitness' ? 60 : first.category === 'meeting' ? 100 : 80;
    wake = Math.min(7 * 60, Math.max(5 * 60, toMin(first.startTime!) - lead));
  }
  const lastEnd = last ? toMin(last.endTime ?? last.startTime!) : 0;
  const lights = lastEnd > 21 * 60 ? Math.min(lastEnd + 90, 24 * 60 + 30) : 22 * 60 + 30;

  let calories: DayPlan['calories'] = null;
  const wantsFuel = trains || opts.calorieTarget || events.some((e) => e.category === 'meal');
  if (wantsFuel) {
    const target = opts.calorieTarget ?? (trains ? 2200 : 2000);
    const split: [string, number, string][] = [
      ['Breakfast', 0.25, 'Oats or eggs, fruit, coffee or tea'],
      ['Lunch', 0.3, 'Lean protein, vegetables, rice or roti'],
      ['Snack', 0.1, 'Greek yogurt, nuts or a banana'],
      ['Dinner', 0.35, 'Protein, a big plate of vegetables, light carbs'],
    ];
    calories = {
      target,
      source: opts.calorieTarget ? 'you' : 'suggested',
      protein: round10((target * 0.28) / 4),
      meals: split.map(([name, pct, idea]) => ({ name, kcal: round10(target * pct), idea })),
    };
  }

  const waterLiters = Math.round((2.5 + (trains ? 0.5 : 0)) * 10) / 10;
  return {
    wake: clock(wake),
    firstMove: first ? formatClock(first.startTime!) : null,
    lastItem: last ? formatClock(last.startTime!) : null,
    lightsOut: clock(lights),
    calories,
    waterLiters,
    waterGlasses: Math.round(waterLiters * 4),
  };
}
