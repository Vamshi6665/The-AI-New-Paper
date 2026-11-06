import type { EventCategory, ExtractedEvent, ExtractionResult } from '@/types/event';
import {
  resolveRelativeDate,
  normalizeTime,
  detectPartOfDay,
  type ResolveContext,
} from '@/lib/datetime/resolve';

/**
 * Deterministic fallback extractor (no AI). Not as nuanced as the model, but it
 * genuinely parses: splits a sentence into clauses, categorizes by keyword,
 * pulls times, and keeps part-of-day as part-of-day. This is what guarantees the
 * product runs and demos with zero configuration.
 */

interface Rule {
  category: EventCategory;
  keywords: RegExp;
}

const RULES: Rule[] = [
  { category: 'birthday', keywords: /\bbirthday|anniversary|celebrat/i },
  {
    category: 'fitness',
    keywords: /\bgym|workout|run|exercise|yoga|cardio|lift|training|upper-body|lower-body/i,
  },
  {
    category: 'medical',
    keywords: /\bdoctor|dentist|clinic|hospital|appointment with dr|medical|checkup|physical/i,
  },
  { category: 'meeting', keywords: /\bmeeting|standup|review|sync|call with|presentation|interview|demo/i },
  { category: 'deadline', keywords: /\bdeadline|due|last day|submit by|pay .* bill|finish .* before/i },
  { category: 'finance', keywords: /\bbill|invoice|rent|payment|pay the|transfer money/i },
  {
    category: 'errand',
    keywords: /\bgroceries|grocery|buy |pick up|drop off|shopping|pharmacy|milk|eggs|bread/i,
  },
  { category: 'travel', keywords: /\bflight|train|drive to|airport|commute|travel|trip/i },
  { category: 'meal', keywords: /\blunch|dinner|breakfast|brunch|coffee with|eat/i },
  { category: 'study', keywords: /\bstudy|read|course|lecture|homework|revise|learn/i },
  { category: 'social', keywords: /\bcall |visit|meet |hang out|family|friends/i },
  { category: 'reminder', keywords: /\bremind|remember to|don't forget/i },
];

const CLAUSE_VERBS =
  'finish|call|attend|go|do|email|send|meet|visit|pay|study|read|drive|submit|work|clean|cook|write|plan|prepare|book|schedule|take|pick|buy|get|have|wash|run|text|message|remind|practice|review|join|start|water|walk|stretch|meditate|call|see|check|organi[sz]e|fix|order|return|renew|file|print|pack';

// Built from plain strings on purpose: a template literal here gets mangled by the production minifier.
const LIST_RE = new RegExp(
  '\\b(buy|need|get|grab)\\b(.*?)(?=(?:,|\\band)\\s+(?:' + CLAUSE_VERBS + ')\\b|\\bthen\\b|;|\\.|$)',
  'gi'
);

function categorize(clause: string): EventCategory {
  for (const r of RULES) if (r.keywords.test(clause)) return r.category;
  return 'task';
}

/** Split a plan sentence into actionable clauses.
 *  A "buy/need/get X, Y, Z" list is protected from the comma split (its commas
 *  are list separators, not clause boundaries) by joining the items with the
 *  placeholder ⁞, which extractChecklist later splits back out. */
function splitClauses(text: string): string[] {
  let t = text.replace(/\b(tomorrow|today)\b\s*[:,\-–—]?/gi, ' ');
  // Protect a grocery/errand list from the comma+and split, but ONLY up to the
  // next clause verb (so "buy groceries and finish X" still splits in two).
  t = t.replace(LIST_RE, (_m, verb: string, rest: string) => `${verb}${rest.replace(/,|\s+and\s+/gi, '⁞')}`);
  return t
    .split(/,| and | then |;|\.|\balso\b/i)
    .map((c) => c.trim().replace(/⁞/g, ', '))
    .filter((c) => c.length > 2 && /[a-z]/i.test(c));
}

function extractTime(clause: string): { start: string | null; raw: string | null; assumed: boolean } {
  const m = clause.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i) || clause.match(/\b(\d{1,2}:\d{2})\b/);
  if (m) return { start: normalizeTime(m[1]!), raw: m[1]!, assumed: false };
  // "at 7" without meridiem — ignore a number immediately followed by "-minute"
  const bare = clause.match(/\b(?:at|by|around)\s+(\d{1,2})\b(?!\s*[-\s]?min)/i);
  if (bare) {
    const h = Number(bare[1]);
    // planner heuristic: 5-11 → AM, 12 → noon, 1-4 → PM, else as-is. Flagged assumed.
    let h24 = h;
    if (h >= 5 && h <= 11) h24 = h;
    else if (h === 12) h24 = 12;
    else if (h >= 1 && h <= 4) h24 = h + 12;
    // context beats the generic guess: dinner/call/movie at 8 is evening, gym/run at 6 is morning
    if (/\b(dinner|supper|movie|party|date night|drinks|call|text)\b/i.test(clause) && h >= 1 && h <= 9) h24 = h + 12;
    else if (/\b(gym|workout|run|jog|yoga|walk|wake|breakfast|commute)\b/i.test(clause) && h >= 4 && h <= 11) h24 = h;
    const partOfDay = detectPartOfDay(clause);
    if (partOfDay === 'evening' || partOfDay === 'night') h24 = h < 12 ? h + 12 : h;
    return { start: `${String(h24).padStart(2, '0')}:00`, raw: bare[1]!, assumed: true };
  }
  return { start: null, raw: null, assumed: false };
}

/** Pull an explicit duration like "45-minute" / "45 min" / "1 hour". */
function extractDuration(clause: string): number | null {
  const min = clause.match(/\b(\d{1,3})\s*[-\s]?min(?:ute)?s?\b/i);
  if (min) return Number(min[1]);
  const hr = clause.match(/\b(\d{1,2})\s*(?:hour|hr)s?\b/i);
  if (hr) return Number(hr[1]) * 60;
  return null;
}

function titleize(clause: string): string {
  let t = clause
    .replace(/\b(at|by|around|from)\s+\d.*$/i, '')
    .replace(/\bfor \d+\s*[-\s]?(?:min|hour|hr).*$/i, '')
    .replace(/\bi (need to|want to|have to|should|must|will|'d like to|would like to)\b/gi, '')
    .replace(/\bi (?:just |only |also )?(?:have|got|'ve got)\s+(?:a |an |the )?/gi, '')
    .replace(/\bi've got (?:a |an |the )?/gi, '')
    .replace(/\bremind me to\b/gi, '')
    .replace(/\bit is\b|\bit's\b/gi, '')
    .replace(/\b\d{1,3}\s*[-\s]?min(?:ute)?s?\b/gi, '')
    .replace(/\b(\d{1,2}(:\d{2})?\s*(am|pm)?)\b/gi, '')
    .replace(/^[\s:,;\-–—]+/, '')
    .replace(/^\s*(then|also|after that|first|next|finally|and|so|i've got|i got|i have got)\s+/i, '')
    .replace(/\b(its|it's)\s+/gi, '')
    .replace(/^\s*(do a|do an|do|go to the|go to|go|have a|have|a|an)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.length > 2 ? t.slice(0, 80) : clause.slice(0, 80);
}

/** Words after the time ("gym at 7 leg day") — keeps useful detail the title drops. */
function tailAfterTime(clause: string): string | null {
  const m = clause.match(/\b(?:at|by|around|from)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b(.*)$/i);
  const tail = m?.[1]?.replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, '').trim();
  return tail && tail.length >= 3 ? tail.slice(0, 120) : null;
}

function extractPerson(clause: string): string | null {
  const bd = clause.match(/\b([A-Z][a-z]+)'s\s+(?:birthday|anniversary)|\b(?:birthday|anniversary)\s+(?:of|for)\s+([A-Z][a-z]+)/);
  if (bd) return (bd[1] ?? bd[2])!;
  const m = clause.match(/\b(?:call|text|message|visit|meet)\s+([A-Z][a-z]+)/);
  if (m) return m[1]!;
  const poss = clause.match(/\b([A-Z][a-z]+)'s\b/);
  return poss ? poss[1]! : null;
}

function extractChecklist(clause: string, category: EventCategory): string[] {
  if (category !== 'errand' && category !== 'task') return [];
  // "milk, eggs, bread and bananas" after a buy/need verb
  const m = clause.match(/\b(?:need to buy|need to get|have to buy|buy|need|get|pick up)\s+(.+)/i);
  if (!m) return [];
  return m[1]!
    .split(/,| and /i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 12);
}

export function ruleExtract(text: string, ctx: ResolveContext): ExtractionResult {
  const date = resolveRelativeDate(text, ctx) ?? ctx.todayLocal;
  const clauses = splitClauses(text);
  const warnings: string[] = [];

  const events: ExtractedEvent[] = clauses.map((clause) => {
    const category = categorize(clause);
    const { start, raw, assumed } = extractTime(clause);
    const part = detectPartOfDay(clause);
    const person = extractPerson(clause);
    const checklist = extractChecklist(clause, category);
    const duration = extractDuration(clause);
    const missing: string[] = [];

    let precision: ExtractedEvent['timePrecision'] = 'none';
    if (start) precision = 'exact';
    else if (part) precision = 'partofday';
    if (assumed) {
      // we assumed AM/PM for a bare hour — keep the time but ask to confirm
      missing.push('AM or PM?');
    } else if (raw && !start) {
      missing.push('exact time (AM or PM?)');
    }

    // derive endTime from start + duration when both are known
    let endTime: string | null = null;
    if (start && duration) {
      const [h, m] = start.split(':').map(Number);
      const total = h! * 60 + m! + duration;
      endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    const reminderMatch = clause.match(/\bat (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    const reminderAt = /\bremind|call|don't forget/i.test(clause) ? normalizeTime(reminderMatch?.[1]) : null;

    return {
      title: titleize(clause),
      category,
      dateLocal: date,
      startTime: start,
      endTime,
      timePrecision: precision,
      partOfDay: part,
      priority: /\b(urgent|important|asap|must|deadline|last day)\b/i.test(clause) ? 'high' : 'normal',
      location: null,
      person,
      description: tailAfterTime(clause),
      checklist,
      reminderAt,
      confidence: 0.6,
      missing,
      isSuggestion: false,
      linkHint: /\bbefore (my |the )?(meeting|appointment|call)\b/i.test(clause)
        ? 'before the meeting'
        : null,
    };
  });

  // "Sarah's birthday ... call her at 8 PM": fold the follow-up call into the birthday
  const bi = events.findIndex((e) => e.category === 'birthday');
  if (bi >= 0) {
    const b = events[bi]!;
    const ci = events.findIndex(
      (e, i) =>
        i > bi &&
        /^(call|text|message|wish|phone|ring)\b/i.test(e.title) &&
        (/\b(her|him|them)\b/i.test(e.title) || (b.person ? new RegExp('\\b' + b.person + '\\b', 'i').test(e.title) : false))
    );
    if (ci >= 0) {
      const c = events[ci]!;
      if (c.startTime && !b.reminderAt) b.reminderAt = c.startTime;
      if (c.startTime && b.timePrecision === 'none') {
        b.startTime = c.startTime;
        b.timePrecision = 'exact';
        b.missing = [...b.missing, ...c.missing];
      }
      events.splice(ci, 1);
    }
    if (b.person) b.title = `${b.person}'s birthday`;
  }

  if (events.length === 0) warnings.push('No distinct activities detected. Try naming what you plan to do.');
  return { events, warnings };
}
