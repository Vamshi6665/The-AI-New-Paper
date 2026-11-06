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
    return NextResponse.json({ error: { code: 'invalid_input', message: 'edition required' } }, { status: 422 });
  }
  const paperSize = body.paperSize === 'a4' ? 'a4' : 'letter';
  const html = renderEditionHtml(body.edition, { paperSize });

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return NextResponse.json({ error: { code: 'pdf_unavailable', message: 'PDF engine unavailable' } }, { status: 503 });
  }

  const executablePath = process.env.CHROMIUM_PATH || undefined;
  let browser;
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
  } catch {
    // no Chromium on this host: tell the client so it can fall back to the print dialog
    return NextResponse.json(
      { error: { code: 'pdf_unavailable', message: 'PDF engine is not installed on this server.' } },
      { status: 503 }
    );
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    // let web fonts land (but never hang if the font host is unreachable), then re-fit
    await page.evaluate(
      () =>
        Promise.race([
          (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready,
          new Promise((r) => setTimeout(r, 4000)),
        ]).then(() => {
          const p = document.querySelector('.paper') as HTMLElement | null;
          const w = window as unknown as { __fitPaper?: (el: HTMLElement) => number };
          if (p && w.__fitPaper) w.__fitPaper(p);
        })
    );
    const pdf = await page.pdf({
      preferCSSPageSize: true, // the paper is exactly one Letter/A4 sheet
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
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
