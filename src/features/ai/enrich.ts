import { generateText, extractJson } from '@/server/ai/client';
import { features, serverEnv } from '@/lib/env';
import { z } from 'zod';
import type { EventRecord } from '@/types/event';

/**
 * Editorial enrichment: invent a masthead, pick a quote themed to the day, and
 * write a lead headline + short front story. AI when configured, otherwise a
 * deterministic set keyed off the day's categories (zero-config).
 */

const EnrichSchema = z.object({
  masthead: z.string().min(1).max(60),
  quote: z.object({ text: z.string().min(1).max(220), author: z.string().min(1).max(60) }),
  leadHeadline: z.string().min(1).max(140),
  leadBody: z.string().min(1).max(900),
  reply: z.string().min(1).max(400),
});
export type Enrichment = z.infer<typeof EnrichSchema> & { ai?: boolean };

function summarizeForPrompt(events: EventRecord[]): string {
  if (events.length === 0) return '(no events — an open day)';
  return events
    .map((e) => {
      const when =
        e.timePrecision === 'exact' && e.startTime
          ? e.startTime
          : e.timePrecision === 'partofday'
            ? e.partOfDay
            : 'anytime';
      return `${e.category}: ${e.title} (${when})`;
    })
    .join('; ');
}

export async function enrichEdition(events: EventRecord[], dateDisplay: string): Promise<Enrichment> {
  if (features.hasAnthropic) {
    try {
      const prompt =
        `You are the editor of a personalized morning newspaper. The reader's plans for ${dateDisplay}:\n` +
        `${summarizeForPrompt(events)}\n\n` +
        `Return ONLY strict JSON:\n` +
        `{"masthead":"an invented newspaper title fitting this day, 2-4 words, e.g. The Morning Dispatch",` +
        `"quote":{"text":"a short real well-known quote that echoes the TONE of this day","author":"who said it"},` +
        `"leadHeadline":"a factual, warm front-page headline about the day (no exaggeration)",` +
        `"leadBody":"2-3 sentences of front-page story summarizing the day, editorial but factual",` +
        `"reply":"a brief, friendly one-line chat reply to the reader confirming their paper is ready"}\n` +
        `Rules: the quote must be real and attributable, chosen to match the day's mood (busy→focus, ` +
        `celebration→joy, rest→calm). Never invent facts about the reader. Keep it grounded.`;
      const raw = await generateText(prompt, {
        system: 'You write warm, factual editorial copy and return strict JSON only.',
        model: serverEnv.AGENT_MODEL,
        maxTokens: 700,
        temperature: 0.7,
      });
      return { ...EnrichSchema.parse(JSON.parse(extractJson(raw))), ai: true };
    } catch {
      // fall through to deterministic
    }
  }
  return deterministicEnrich(events);
}

// ---- zero-config fallback ----

const QUOTES_BY_MOOD: Record<string, { text: string; author: string }[]> = {
  busy: [
    {
      text: 'It is not enough to be busy; the question is: what are we busy about?',
      author: 'Henry David Thoreau',
    },
    { text: 'Either you run the day or the day runs you.', author: 'Jim Rohn' },
  ],
  celebration: [
    {
      text: 'The more you praise and celebrate your life, the more there is in life to celebrate.',
      author: 'Oprah Winfrey',
    },
    { text: 'We do not remember days, we remember moments.', author: 'Cesare Pavese' },
  ],
  health: [
    { text: 'Take care of your body. It is the only place you have to live.', author: 'Jim Rohn' },
    { text: 'The groundwork for all happiness is good health.', author: 'Leigh Hunt' },
  ],
  calm: [
    { text: 'Each day is a little life.', author: 'Arthur Schopenhauer' },
    { text: 'Smile, breathe, and go slowly.', author: 'Thich Nhat Hanh' },
  ],
  default: [
    { text: 'Well begun is half done.', author: 'Aristotle' },
    { text: 'Begin, be bold, and venture to be wise.', author: 'Horace' },
  ],
};

const MASTHEADS = [
  'The Morning Dispatch',
  'The Daily Ledger',
  'The Early Edition',
  'The Day Herald',
  'The Dawn Chronicle',
];

function moodOf(events: EventRecord[]): keyof typeof QUOTES_BY_MOOD {
  const cats = new Set(events.map((e) => e.category));
  if (cats.has('birthday')) return 'celebration';
  if (cats.has('fitness') || cats.has('medical')) return 'health';
  if (events.length >= 5) return 'busy';
  if (events.length <= 1) return 'calm';
  return 'default';
}

function deterministicEnrich(events: EventRecord[]): Enrichment {
  const mood = moodOf(events);
  const seed = events.length + (events[0]?.title.length ?? 0);
  const quotes = QUOTES_BY_MOOD[mood]!;
  const quote = quotes[seed % quotes.length]!;
  const masthead = MASTHEADS[seed % MASTHEADS.length]!;
  const n = events.length;
  const leadHeadline =
    n === 0
      ? 'A Clear Day Ahead'
      : mood === 'celebration'
        ? 'A Day to Celebrate, and to Get Things Done'
        : mood === 'busy'
          ? 'A Full Day Ahead: The Hours Are Spoken For'
          : mood === 'health'
            ? 'Health and Routine Lead the Day'
            : 'The Day, Planned and Ready';
  return {
    masthead,
    quote,
    leadHeadline,
    leadBody:
      n === 0
        ? 'The day lies open and unwritten — a rare and quiet luxury. What you make of it is entirely yours.'
        : `${n} ${n === 1 ? 'item is' : 'items are'} on the schedule today. The edition below lays them out in order, from the first appointment to the last reminder.`,
    reply:
      n === 0
        ? "Here's your paper for an open day. Tell me what comes up and I'll set a new edition."
        : `Done — your edition is set with ${n} ${n === 1 ? 'item' : 'items'}. Scroll down to read it, or print it for the morning.`,
  };
}
