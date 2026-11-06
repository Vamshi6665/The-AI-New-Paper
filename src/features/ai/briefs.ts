import { z } from 'zod';
import { generateText, extractJson } from '@/server/ai/client';
import { features, serverEnv } from '@/lib/env';
import type { EventRecord } from '@/types/event';
import type { EventBrief } from '@/types/edition';

/**
 * Optional AI layer: richer, more personal per-event plans. Strictly additive:
 * the deterministic planner already produces a full brief for every event, and
 * anything malformed here is dropped (Zod) rather than trusted.
 */
const BriefSchema = z.object({
  blurb: z.string().min(1).max(160),
  steps: z.array(z.string().min(1).max(110)).min(2).max(7),
  checklist: z.array(z.string().min(1).max(70)).max(8).default([]),
});
const BriefsSchema = z.record(z.string(), BriefSchema);

export async function aiBriefs(
  events: EventRecord[],
  dateDisplay: string,
  userText: string
): Promise<Record<string, Partial<EventBrief>>> {
  if (!features.hasAnthropic || events.length === 0) return {};
  try {
    const list = events
      .map((e, i) => `${i + 1}|${e.id}|${e.category}|${e.title}|${e.startTime ?? e.partOfDay ?? 'anytime'}|${e.person ?? ''}`)
      .join('\n');
    const raw = await generateText(
      `Plan for ${dateDisplay}. The person said: """${userText.slice(0, 1200)}"""\n\nEvents (n|id|category|title|time|person):\n${list}\n\n` +
        `For EACH event id write a practical, specific plan. Return ONLY strict JSON keyed by id: ` +
        `{"<id>":{"blurb":"one useful line","steps":["3-6 concrete ordered steps; for workouts use 'Exercise — 4 x 8'"],"checklist":["things to bring/buy/prepare"]}}. ` +
        `Be concrete (sets, reps, what to bring, what to ask). Never invent facts about the person, names, or addresses. General wellness guidance only.`,
      {
        system: 'You are a practical personal planner. Return strict JSON only.',
        model: serverEnv.AGENT_MODEL,
        maxTokens: 2400,
        temperature: 0.5,
      }
    );
    const parsed = BriefsSchema.parse(JSON.parse(extractJson(raw)));
    const ids = new Set(events.map((e) => e.id));
    return Object.fromEntries(Object.entries(parsed).filter(([id]) => ids.has(id)));
  } catch {
    return {};
  }
}
