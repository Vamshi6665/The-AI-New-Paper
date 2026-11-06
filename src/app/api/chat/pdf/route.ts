import { NextResponse, type NextRequest } from 'next/server';
import { renderEditionHtml } from '@/features/editions/render-html';
import type { Edition } from '@/types/edition';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/chat/pdf — render an already-composed edition (from the chat) to a
 * PDF. Takes the edition object directly so the PDF matches exactly what the
 * reader saw, with no recomputation.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    edition?: Edition;
    paperSize?: 'letter' | 'a4';
  } | null;
  if (!body?.edition) {
    return NextResponse.json({ error: 'edition required' }, { status: 422 });
  }
  const paperSize = body.paperSize === 'a4' ? 'a4' : 'letter';
  const html = renderEditionHtml(body.edition, { paperSize });

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return NextResponse.json({ error: 'PDF engine unavailable' }, { status: 503 });
  }

  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format: paperSize === 'a4' ? 'A4' : 'Letter',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${body.edition.editionDate}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
