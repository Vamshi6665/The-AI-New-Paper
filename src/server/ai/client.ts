import Anthropic from '@anthropic-ai/sdk';
import { serverEnv, features } from '@/lib/env';

let _anthropic: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!features.hasAnthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

/**
 * Extract the first balanced JSON object from a model response. Models
 * sometimes wrap JSON in prose or fences despite instructions, so we strip
 * fences and slice from the first `{` to the last `}`.
 */
export function extractJson(text: string): string {
  let t = text
    .trim()
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}

export interface GenerateOptions {
  system?: string;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}

export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const res = await anthropic().messages.create({
    model: opts.model ?? serverEnv.AGENT_MODEL,
    max_tokens: opts.maxTokens ?? 1600,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .trim();
}
