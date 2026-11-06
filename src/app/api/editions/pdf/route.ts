import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eventStore } from '@/server/repositories/event-store';
import { composeEdition } from '@/features/editions/compose';
import { renderEditionHtml } from '@/features/editions/render-html';

export const runtime = 'nodejs';
export const maxDuration = 60;

const USER = 'demo-user';

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  masthead: z.string().max(80).optional(),
  paperSize: z.enum(['letter', 'a4']).default('letter'),
});

/**
 * POST /api/editions/pdf — server-side Chromium PDF of the full edition.
 * Uses the SAME canonical document model as the on-screen preview (spec §13),
 * so the printed PDF and the preview never diverge.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });
  }

  const events = await eventStore().listByDate(USER, parsed.data.date);
  const edition = composeEdition({ events, editionDate: parsed.data.date, masthead: parsed.data.masthead });
  const html = renderEditionHtml(edition, { paperSize: parsed.data.paperSize });

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return NextResponse.json(
      { error: 'PDF engine unavailable', hint: 'Run `npx playwright install chromium` on the server.' },
      { status: 503 }
    );
  }

  // Allow a system/override chromium path (useful in minimal containers).
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: parsed.data.paperSize === 'a4' ? 'A4' : 'Letter',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="daily-edition-${parsed.data.date}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
