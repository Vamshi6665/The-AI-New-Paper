import { NextResponse } from 'next/server';
import { features } from '@/lib/env';

export const runtime = 'nodejs';

/** GET /api/health — liveness + which optional subsystems are configured. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    time: new Date().toISOString(),
    features: {
      ai: features.hasAnthropic,
      database: features.hasDatabase,
    },
  });
}
