import { generateText, extractJson } from '@/server/ai/client';
import { features, serverEnv } from '@/lib/env';
import { ExtractionResultSchema, type ExtractedEvent, type ExtractionResult } from '@/types/event';
import {
  resolveRelativeDate,
  normalizeTime,
  detectPartOfDay,
  todayInTz,
  type ResolveContext,
} from '@/lib/datetime/resolve';
import { ruleExtract } from './rule-extract';

const SYSTEM =
  'You are the event-understanding engine of "The Daily Edition", a personal planner. ' +
  "You convert a person's natural-language plans into STRUCTURED events. You never fabricate " +
  'exact dates, times, locations, names, diagnoses, or deadlines. When something is missing, ' +
  'you leave it null and list it under "missing". You split independently actionable activities ' +
  'into separate events — never merge them. You return STRICT JSON only, no markdown.';

function buildPrompt(text: string, ctx: ResolveContext): string {
  return (
    `Reference date (user's "today"): ${ctx.todayLocal} (timezone ${ctx.timezone}).\n` +
    `User input:\n"""${text}"""\n\n` +
    `Extract every distinct, independently-actionable event. Return ONLY strict JSON:\n` +
    `{"events":[{` +
    `"title":"short title","category":"one of: birthday|fitness|medical|meeting|appointment|task|deadline|reminder|travel|meal|study|errand|social|finance|habit|other",` +
    `"dateLocal":"yyyy-mm-dd","startTime":"H:MM AM/PM or null","endTime":"... or null",` +
    `"timePrecision":"exact|partofday|none","partOfDay":"morning|afternoon|evening|night or null",` +
    `"priority":"low|normal|high","location":"... or null","person":"name or null",` +
    `"description":"... or null","checklist":["item"],"reminderAt":"time or null",` +
    `"confidence":0.0-1.0,"missing":["field names a human should confirm"],` +
    `"isSuggestion":false,"linkHint":"e.g. before the meeting, or null"}],"warnings":["..."]}\n\n` +
    `Rules:\n` +
    `- Resolve "tomorrow", "next Monday", etc. against the reference date.\n` +
    `- Keep "evening"/"morning" as timePrecision "partofday" with partOfDay set — do NOT invent a clock time.\n` +
    `- A birthday + "call them at 8pm" is ONE birthday event with reminderAt 8:00 PM and person set.\n` +
    `- "finish X before my meeting" is a separate task with linkHint; do not assign it a made-up start time.\n` +
    `- Groceries/errands with items → category errand/task, checklist = the items.\n` +
    `- If a workout names only an intention, set isSuggestion true ONLY on any exercise plan you add.\n` +
    `- Never guess am vs pm when genuinely ambiguous — set timePrecision none and add to missing.`
  );
}

/** Post-process AI output deterministically: dates, times, safety clamps. */
function sanitize(ev: ExtractedEvent, ctx: ResolveContext, rawText: string): ExtractedEvent {
  // Re-resolve the date deterministically from the raw text when possible.
  const resolved = resolveRelativeDate(rawText, ctx) ?? resolveRelativeDate(ev.dateLocal, ctx);
  const dateLocal = resolved ?? ev.dateLocal ?? ctx.todayLocal;

  // Normalize times; demote to part-of-day/none if not a real clock time.
  const start = normalizeTime(ev.startTime);
  const end = normalizeTime(ev.endTime);
  let precision = ev.timePrecision;
  let partOfDay = ev.partOfDay;
  if (start) {
    precision = 'exact';
  } else if (partOfDay || detectPartOfDay(rawText)) {
    precision = 'partofday';
    partOfDay = partOfDay ?? detectPartOfDay(rawText);
  } else {
    precision = 'none';
  }

  return {
    ...ev,
    dateLocal,
    startTime: start,
    endTime: end,
    timePrecision: precision,
    partOfDay,
    reminderAt: normalizeTime(ev.reminderAt),
  };
}

/**
 * Extract structured events from natural language. Uses Anthropic when
 * configured; otherwise a deterministic rule-based extractor so the product
 * works with zero config. Output is always Zod-validated and sanitized.
 */
export async function extractEvents(text: string, timezone: string): Promise<ExtractionResult> {
  const ctx: ResolveContext = { timezone, todayLocal: todayInTz(timezone) };

  let result: ExtractionResult;
  if (features.hasAnthropic) {
    try {
      const raw = await generateText(buildPrompt(text, ctx), {
        system: SYSTEM,
        model: serverEnv.AGENT_MODEL,
        maxTokens: 1800,
        temperature: 0.2,
      });
      result = ExtractionResultSchema.parse(JSON.parse(extractJson(raw)));
    } catch {
      result = ruleExtract(text, ctx);
    }
  } else {
    result = ruleExtract(text, ctx);
  }

  result.events = result.events.map((e) => sanitize(e, ctx, text));
  return result;
}
