import { z } from 'zod';

/**
 * Type-safe environment access. Server-only secrets are validated lazily so the
 * client bundle never imports them. Public vars are validated eagerly.
 *
 * In Phase 0 the app runs without any of these (Instant mode only); each
 * subsystem checks its own requirement and degrades gracefully.
 */

const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  AGENT_MODEL: z.string().default('claude-sonnet-4-5'),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('The Daily Edition'),
});

export const serverEnv = serverSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  AGENT_MODEL: process.env.AGENT_MODEL,
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
});

export const features = {
  hasAnthropic: Boolean(serverEnv.ANTHROPIC_API_KEY),
  hasDatabase: Boolean(serverEnv.DATABASE_URL),
};
