import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';

/**
 * Production HTTP helpers: consistent response envelopes, structured logging,
 * a lightweight in-memory rate limiter, and a handler wrapper that turns
 * thrown errors into clean JSON instead of leaking stack traces.
 */

// ---- response envelopes ----
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

// ---- request id + logging (no sensitive content) ----
export function requestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function log(event: string, fields: Record<string, unknown> = {}) {
  // structured, single-line — safe for aggregators. Never log event text/PII.
  try {
    console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }));
  } catch {
    console.log(event, fields);
  }
}

// ---- rate limiter (in-memory token bucket, per IP+route) ----
const buckets = new Map<string, { tokens: number; updated: number }>();

export function rateLimit(
  req: NextRequest,
  route: string,
  opts: { limit: number; windowMs: number } = { limit: 20, windowMs: 60_000 }
): { allowed: boolean; retryAfter: number } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  const key = `${route}:${ip}`;
  const now = Date.now();
  const refillRate = opts.limit / opts.windowMs;

  const b = buckets.get(key) ?? { tokens: opts.limit, updated: now };
  b.tokens = Math.min(opts.limit, b.tokens + (now - b.updated) * refillRate);
  b.updated = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    return { allowed: false, retryAfter: Math.ceil((1 - b.tokens) / refillRate / 1000) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { allowed: true, retryAfter: 0 };
}

// periodic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, v] of buckets) if (v.updated < cutoff) buckets.delete(k);
}, 5 * 60_000).unref?.();

// ---- validated POST handler wrapper ----
export async function handlePost<S extends ZodTypeAny>(
  req: NextRequest,
  route: string,
  schema: S,
  fn: (body: ZodInfer<S>, ctx: { reqId: string }) => Promise<NextResponse>,
  rl: { limit: number; windowMs: number } = { limit: 20, windowMs: 60_000 }
): Promise<NextResponse> {
  const reqId = requestId();

  const limited = rateLimit(req, route, rl);
  if (!limited.allowed) {
    log('rate_limited', { route, reqId });
    return fail(429, 'rate_limited', 'Too many requests. Please wait a moment.', {
      retryAfter: limited.retryAfter,
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, 'bad_json', 'Request body must be valid JSON.');
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(422, 'invalid_input', 'Some fields are missing or invalid.', {
      details: (parsed.error as ZodError).flatten(),
    });
  }

  const start = Date.now();
  try {
    const res = await fn(parsed.data, { reqId });
    log('request', { route, reqId, status: res.status, ms: Date.now() - start });
    return res;
  } catch (err) {
    log('error', { route, reqId, message: err instanceof Error ? err.message : 'unknown' });
    return fail(500, 'server_error', 'Something went wrong while building your edition.');
  }
}
